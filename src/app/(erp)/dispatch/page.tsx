"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { DispatchPlanChip } from "@/components/dispatch/dispatch-plan-chip";
import { useDispatchPlanning } from "@/hooks/use-dispatch-planning";

export default function DispatchPlanningPage() {
  const router = useRouter();
  const { data, loading, error, reload } = useDispatchPlanning();

  const goToPlan = (orderId: string, status?: string) => {
    const params = new URLSearchParams({ order: orderId });
    if (status) params.set("status", status);
    router.push(`/dispatch/new?${params.toString()}`);
  };

  const hasData = Boolean(data?.hasData);
  const awaitingOrders = data?.awaitingOrders ?? [];
  const plannedDispatches = data?.plannedDispatches ?? [];
  const stats = data?.stats ?? { ready: 0, pack: 0, vehicle: 0, delayed: 0 };

  return (
    <div className="dispatch-plan">
      <DashHead
        title="Dispatch Planning"
        sub="Plan shipments, assign vehicles — driver app not mandatory"
      >
        <Btn
          variant="primary"
          size="sm"
          icon="invoice"
          disabled={!data?.dbConfigured || awaitingOrders.length === 0}
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
          <div className="dispatch-plan-stats">
            <div className="dispatch-plan-stat dispatch-plan-stat--ready">
              <div className="dispatch-plan-stat__label">Ready</div>
              <div className="dispatch-plan-stat__value success">{stats.ready}</div>
              <div className="dispatch-plan-stat__sub">Packaged & ready to load</div>
            </div>
            <div className="dispatch-plan-stat dispatch-plan-stat--pack">
              <div className="dispatch-plan-stat__label">Packaging Pending</div>
              <div className="dispatch-plan-stat__value warning">{stats.pack}</div>
              <div className="dispatch-plan-stat__sub">Awaiting packing</div>
            </div>
            <div className="dispatch-plan-stat dispatch-plan-stat--vehicle">
              <div className="dispatch-plan-stat__label">Vehicle Pending</div>
              <div className="dispatch-plan-stat__value accent">{stats.vehicle}</div>
              <div className="dispatch-plan-stat__sub">Vehicle to assign</div>
            </div>
            <div className="dispatch-plan-stat dispatch-plan-stat--delayed">
              <div className="dispatch-plan-stat__label">Delayed</div>
              <div className="dispatch-plan-stat__value danger">{stats.delayed}</div>
              <div className="dispatch-plan-stat__sub">Past requested date</div>
            </div>
          </div>

          {awaitingOrders.length > 0 ? (
            <div className="card dispatch-plan-table-card dispatch-plan-table-card--full">
              <div className="card-head">
                <div className="card-title">
                  <Icon name="clock" size={14} /> Orders awaiting dispatch planning
                </div>
                <Btn variant="secondary" size="sm" onClick={() => reload()}>
                  Refresh
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
                            <div className="dispatch-plan-row-actions">
                              {row.status !== "vehicle" && row.status !== "delayed" ? (
                                <Btn
                                  variant="primary"
                                  size="sm"
                                  onClick={() => goToPlan(row.id)}
                                >
                                  Plan
                                </Btn>
                              ) : null}
                              <Btn
                                variant="secondary"
                                size="sm"
                                onClick={() => goToPlan(row.id, "vehicle")}
                              >
                                Assign vehicle
                              </Btn>
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
                        <th>Plan status</th>
                        <th aria-label="Actions" />
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
                          <td>
                            <DispatchPlanChip status={row.planStatus} />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="dispatch-plan-view-btn"
                              title={`View ${row.id}`}
                              aria-label={`View dispatch ${row.id}`}
                              onClick={() => router.push(`/dispatch/${row.id}`)}
                            >
                              <Icon name="eye" size={15} />
                            </button>
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
