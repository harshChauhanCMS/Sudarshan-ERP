"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { OrderDetailPanel } from "@/components/orders/order-detail-panel";
import { useOrderDetail } from "@/hooks/use-order-detail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { order, loading, error } = useOrderDetail(id);

  return (
    <div className="order-detail-page">
      <DashHead
        title={order?.id ?? id}
        sub={order ? `${order.customer} · ${order.product}` : "Sales order details"}
      >
        <Btn
          variant="secondary"
          size="sm"
          icon="chevLeft"
          onClick={() => router.push("/orders")}
        >
          Back to orders
        </Btn>
      </DashHead>

      {loading && !order ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>Loading…</p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>{error}</p>
      ) : null}

      {order ? <OrderDetailPanel order={order} /> : null}
    </div>
  );
}
