"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { DispatchDetailPanel } from "@/components/dispatch/dispatch-detail-panel";
import { useDispatchDetail } from "@/hooks/use-dispatch-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function DispatchDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, error, reload, lastRefreshedAt } = useDispatchDetail(id);

  return (
    <div className="dispatch-plan dispatch-detail-page">
      <DashHead
        title={data?.id ?? id}
        sub="Live tracking, route, and driver check-in barcode"
      >
        <Btn
          variant="primary"
          size="sm"
          icon="edit"
          onClick={() => router.push(`/dispatch/${id}/edit`)}
        >
          Edit dispatch
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          icon="chevLeft"
          onClick={() => router.push("/dispatch")}
        >
          Back to planning
        </Btn>
      </DashHead>

      {loading && !data ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>Loading…</p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>{error}</p>
      ) : null}

      {data ? (
        <DispatchDetailPanel
          detail={data}
          lastRefreshedAt={lastRefreshedAt}
          onRefresh={() => void reload(true)}
          onLocationUpdated={() => void reload(true)}
        />
      ) : null}
    </div>
  );
}
