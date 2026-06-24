"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { DispatchPlanForm } from "@/components/dispatch/dispatch-plan-form";
import { useDispatchPlanning } from "@/hooks/use-dispatch-planning";
import { useErpData } from "@/context/erp-data-provider";

export default function NewDispatchPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh: refreshErp } = useErpData();
  const { data, loading, error, reload } = useDispatchPlanning();

  const orderId = searchParams.get("order") ?? undefined;
  const awaitingOrders = data?.awaitingOrders ?? [];
  const canPlan = Boolean(data?.dbConfigured && awaitingOrders.length > 0);

  const handleSuccess = async () => {
    await Promise.all([reload(), refreshErp()]);
    router.push("/dispatch");
  };

  return (
    <div className="dispatch-plan">
      <DashHead
        title="New dispatch plan"
        sub="Plan route and delivery — assign a driver now or after planning"
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/dispatch")}
        >
          Back to planning
        </Btn>
      </DashHead>

      {loading ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>Loading…</p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>{error}</p>
      ) : null}

      {!loading && !error && data && !data.dbConfigured ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>
          Database is not configured. Set <code>MONGODB_URI</code> and run{" "}
          <code>npm run seed</code> to create dispatch plans.
        </p>
      ) : null}

      {!loading && !error && canPlan ? (
        <DispatchPlanForm
          orders={awaitingOrders}
          companyLabel={data?.companyLabel ?? ""}
          initialOrderId={orderId}
          onSuccess={handleSuccess}
        />
      ) : null}
    </div>
  );
}
