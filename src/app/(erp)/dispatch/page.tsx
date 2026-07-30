"use client";

import { useRouter } from "next/navigation";
import { message } from "antd";
import {
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import StatCard from "@/components/common/StatCard";
import { DashHead, DashboardBannerCarousel, DISPATCH_BANNER_SLIDES } from "@/components/erp/dashboards";
import { DispatchPlanChip } from "@/components/dispatch/dispatch-plan-chip";
import { useDispatchPlanning } from "@/hooks/use-dispatch-planning";
import { isDriverUnassigned } from "@/lib/dispatch-planning-api";

export default function DispatchPlanningPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useDispatchPlanning();

  const goToPlan = (orderId: string) => {
    router.push(`/dispatch/new?order=${encodeURIComponent(orderId)}`);
  };

  const handleRefresh = async () => {
    await reload();
    message.success("Refreshed");
  };

  const hasData = Boolean(data?.hasData);
  const awaitingOrders = data?.awaitingOrders ?? [];
  const plannedDispatches = data?.plannedDispatches ?? [];
  const stats = data?.stats ?? { ready: 0, pack: 0, vehicle: 0, delayed: 0 };

  return (
    <div className="dispatch-plan">
      <DashHead
        title="Dispatch Planning"
        sub="Plan shipments first, then assign drivers to planned dispatches"
      >
        <Btn
          variant="primary"
          size="sm"
          icon="invoice"
          disabled={!data?.dbConfigured}
          onClick={() => router.push("/dispatch/new")}
        >
          New dispatch plan
        </Btn>
        <Btn
          variant="secondary"
          size="sm"
          icon="menu"
          onClick={() => router.push("/dashboard/dispatch")}
        >
          Dispatch dashboard
        </Btn>
      </DashHead>

      <DashboardBannerCarousel
        slides={DISPATCH_BANNER_SLIDES}
        navigate={(href: string) => router.push(href)}
      />

      {loading ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>Loading…</p>
      ) : null}

      {error ? (
        <p style={{ color: "var(--danger)", fontSize: 13, margin: "0 0 1rem" }}>{error}</p>
      ) : null}

      {!loading && !error && data && !data.dbConfigured ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14, margin: 0 }}>
          Database is not configured. Set <code>MONGODB_URI</code> and run{" "}
          <code>npm run seed</code> to load dispatch data.
        </p>
      ) : null}

      {!loading && !error && hasData ? (
        <>
          <div className="dispatch-plan-stats attendance-kpi-grid attendance-kpi-grid--4">
            <StatCard
              icon={CheckCircleOutlined}
              label="Ready"
              value={stats.ready}
              hint="Packaged & ready to load"
              hintTone="positive"
            />
            <StatCard
              icon={InboxOutlined}
              label="Packaging Pending"
              value={stats.pack}
              hint="Awaiting packing"
              hintTone="warning"
            />
            <StatCard
              icon={CarOutlined}
              label="Vehicle Pending"
              value={stats.vehicle}
              hint="Vehicle to assign"
              hintTone="accent"
            />
            <StatCard
              icon={ClockCircleOutlined}
              label="Delayed"
              value={stats.delayed}
              hint="Past requested date"
              hintTone="negative"
            />
          </div>

          {awaitingOrders.length > 0 ? (
            <div className="card dispatch-plan-table-card dispatch-plan-table-card--full">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="clock" size={14} /> Orders awaiting dispatch planning
                </div>
                <Btn
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => void handleRefresh()}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </Btn>
              </div>
              <div className="card-body flush">
                <div className="dispatch-plan-table-wrap">
                  <table className="dispatch-plan-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Requested</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingOrders.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.id}</strong>
                          </td>
                          <td>{row.customer}</td>
                          <td>{row.product}</td>
                          <td>{row.qty}</td>
                          <td>{row.requested}</td>
                          <td>
                            <DispatchPlanChip status={row.status} />
                          </td>
                          <td>
                            <Btn
                              variant="primary"
                              size="sm"
                              onClick={() => goToPlan(row.id)}
                            >
                              Plan
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {plannedDispatches.length > 0 ? (
            <div className="card dispatch-plan-table-card dispatch-plan-table-card--full">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="truck" size={14} /> Planned dispatches
                </div>
              </div>
              <div className="card-body flush">
                <div className="dispatch-plan-table-wrap">
                  <table className="dispatch-plan-table">
                    <thead>
                      <tr>
                        <th>Dispatch</th>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Loaded</th>
                        <th>ETA</th>
                        <th>Vehicle</th>
                        <th>Driver</th>
                        <th>Plan status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plannedDispatches.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <strong>{row.id}</strong>
                          </td>
                          <td>{row.orderId}</td>
                          <td>{row.customer}</td>
                          <td>{row.product}</td>
                          <td>{row.loaded}</td>
                          <td>{row.eta}</td>
                          <td>{row.vehicle === "—" ? "—" : row.vehicle}</td>
                          <td>{isDriverUnassigned(row.driver) ? "—" : row.driver}</td>
                          <td>
                            <DispatchPlanChip status={row.planStatus} />
                          </td>
                          <td>
                            <div className="dispatch-plan-row-actions">
                              {isDriverUnassigned(row.driver) &&
                              row.status !== "delivered" &&
                              row.status !== "cancelled" ? (
                                <Btn
                                  variant="primary"
                                  size="sm"
                                  icon="user"
                                  onClick={() => router.push(`/dispatch/${row.id}/edit`)}
                                >
                                  Assign driver
                                </Btn>
                              ) : null}
                              <button
                                type="button"
                                className="dispatch-plan-view-btn"
                                title={`View ${row.id}`}
                                aria-label={`View dispatch ${row.id}`}
                                onClick={() => router.push(`/dispatch/${row.id}`)}
                              >
                                <Icon name="eye" size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
