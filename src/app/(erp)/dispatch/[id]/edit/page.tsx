"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { DispatchPlanForm } from "@/components/dispatch/dispatch-plan-form";
import { useDispatchPlanning } from "@/hooks/use-dispatch-planning";
import { useOrders } from "@/hooks/use-orders";
import { useErpData } from "@/context/erp-data-provider";
import {
  fetchDispatchPlanEdit,
  isDriverUnassigned,
  type DispatchPlanFormValues,
} from "@/lib/dispatch-planning-api";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditDispatchPlanPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { refresh: refreshErp } = useErpData();
  const { data, loading: planningLoading, error: planningError, reload } = useDispatchPlanning();
  const { orders: allOrders, loading: ordersLoading } = useOrders();
  const [editValues, setEditValues] = useState<DispatchPlanFormValues | null>(null);
  const [linkedOrderId, setLinkedOrderId] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingEdit(true);
    setError(null);
    fetchDispatchPlanEdit(id)
      .then((edit) => {
        if (!cancelled) {
          setEditValues(edit.form);
          setLinkedOrderId(edit.linkedOrderId ?? edit.form.orderId ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load dispatch");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSuccess = async () => {
    await Promise.all([reload(), refreshErp()]);
    router.push(`/dispatch/${id}`);
  };

  const loading = planningLoading || loadingEdit || ordersLoading;
  const canEdit = Boolean(data?.dbConfigured && editValues);
  const assigningDriver = Boolean(editValues && isDriverUnassigned(editValues.driverName));

  return (
    <div className="dispatch-plan">
      <DashHead
        title={assigningDriver ? `Assign driver · ${id}` : `Edit ${id}`}
        sub={
          assigningDriver
            ? "This dispatch is planned — add vehicle and driver details"
            : "Update route, vehicle, driver, and plan status"
        }
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="chevLeft"
          onClick={() => router.push(`/dispatch/${id}`)}
        >
          Back to dispatch
        </Btn>
      </DashHead>

      {loading ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>Loading…</p>
      ) : null}

      {error || planningError ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>
          {error ?? planningError}
        </p>
      ) : null}

      {!loading && !error && data && !data.dbConfigured ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>
          Database is not configured. Set <code>MONGODB_URI</code> and run{" "}
          <code>npm run seed</code> to edit dispatch plans.
        </p>
      ) : null}

      {!loading && !error && canEdit && editValues ? (
        <DispatchPlanForm
          mode="edit"
          dispatchId={id}
          linkedOrderId={linkedOrderId}
          requireDriverAssignment={assigningDriver}
          editValues={editValues}
          allOrders={allOrders}
          companyLabel={data?.companyLabel ?? ""}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
