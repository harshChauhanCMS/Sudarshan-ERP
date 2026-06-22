"use client";

import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { useFieldActivityDashboard } from "@/hooks/use-field-activity-dashboard";

function latLngToPercent(lat: number, lng: number) {
  const x = ((lng - 69) / 9) * 100;
  const y = ((30 - lat) / 7) * 100;
  return {
    x: Math.min(92, Math.max(8, x)),
    y: Math.min(88, Math.max(12, y)),
  };
}

function formatDuration(mins: number | null) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "PENDING",
    accepted: "ACCEPTED",
    "in-progress": "IN PROGRESS",
    completed: "COMPLETED",
    cancelled: "CANCELLED",
  };
  return map[status] ?? status.toUpperCase();
}

function badgeClass(badge: string) {
  if (badge === "field" || badge === "onsite") return "field";
  if (badge === "done") return "done";
  if (badge === "delayed") return "delayed";
  return "office";
}

export function FieldActivityDashboardPage() {
  const { data, loading, error, reload } = useFieldActivityDashboard();
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const kpis = data
    ? [
        {
          label: "Employees on site / field",
          value: String(data.kpis.employeesInField),
          hint: "Punched in today with GPS",
          tone: "teal",
        },
        {
          label: "Visits completed today",
          value: String(data.kpis.visitsCompletedToday),
          hint: today,
          tone: "green",
        },
        {
          label: "Pending visit acceptance",
          value: String(data.kpis.pendingVisits),
          hint: "Awaiting employee action",
          tone: "amber",
        },
        {
          label: "Average visit duration",
          value: formatDuration(data.kpis.avgVisitDurationMinutes),
          hint: "Accepted → completed",
          tone: "teal",
        },
      ]
    : [];

  return (
    <>
      <DashHead
        title="Field Activity Dashboard"
        sub="Live onsite & field employee locations, visits, and check-ins"
      >
        <Btn variant="secondary" size="sm" icon="refresh" onClick={() => void reload(true)}>
          Refresh
        </Btn>
      </DashHead>

      {loading && !data ? (
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>Loading live field data…</p>
      ) : null}
      {error ? <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p> : null}

      {data ? (
        <div className="field-activity-page">
          <div className="field-activity-kpi-grid">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className={`field-activity-kpi field-activity-kpi--${kpi.tone}`}
              >
                <div className="field-activity-kpi__label">{kpi.label}</div>
                <div className="field-activity-kpi__value">{kpi.value}</div>
                <div className="field-activity-kpi__hint">{kpi.hint}</div>
              </div>
            ))}
          </div>

          <div className="field-activity-map-row">
            <div className="field-activity-map-main">
              <div className="field-activity-map-frame card">
                <div className="card-head">
                  <div className="card-title">
                    <Icon name="map" size={14} /> Live employee locations
                  </div>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div
                    style={{
                      position: "relative",
                      minHeight: 320,
                      background:
                        "linear-gradient(180deg, #e8f4f8 0%, #f0f7f4 40%, #faf6ee 100%)",
                      borderRadius: "0 0 12px 12px",
                      overflow: "hidden",
                    }}
                  >
                    {data.mapEmployees.length === 0 ? (
                      <div className="dispatch-detail-map-empty">
                        <Icon name="pin" size={28} />
                        <p>No GPS locations yet</p>
                        <span>Onsite/field employees appear here after punch-in with location.</span>
                      </div>
                    ) : (
                      data.mapEmployees.map((rep) => {
                        const pos = latLngToPercent(rep.lat, rep.lng);
                        return (
                          <div
                            key={rep.employeeId}
                            title={`${rep.label} · ${rep.city}`}
                            style={{
                              position: "absolute",
                              left: `${pos.x}%`,
                              top: `${pos.y}%`,
                              transform: "translate(-50%, -50%)",
                              zIndex: 5,
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: rep.color,
                                color: "white",
                                display: "grid",
                                placeItems: "center",
                                fontWeight: 700,
                                fontSize: 11,
                                border: "3px solid white",
                                boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
                              }}
                            >
                              {rep.initials}
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: "calc(100% + 4px)",
                                transform: "translateX(-50%)",
                                fontSize: 9,
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                background: "rgba(255,255,255,0.92)",
                                padding: "2px 6px",
                                borderRadius: 4,
                                border: "1px solid var(--border)",
                              }}
                            >
                              {rep.city}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="field-activity-map-side">
              <div className="field-activity-panel">
                <div className="field-activity-panel__head field-activity-panel__head--warm">
                  <Icon name="user" size={14} />
                  Employee live status
                </div>
                <div className="field-activity-panel__body">
                  {data.liveEmployees.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>
                      No onsite or field employees checked in right now.
                    </p>
                  ) : (
                    data.liveEmployees.map((row) => (
                      <div key={`${row.employeeId}-${row.status}`} className="field-activity-row">
                        <span className="field-activity-row__name">{row.name}</span>
                        <span
                          className={`field-activity-badge field-activity-badge--${badgeClass(row.badge)}`}
                        >
                          {row.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="field-activity-panel">
                <div className="field-activity-panel__head field-activity-panel__head--mint">
                  <Icon name="map" size={14} />
                  Area summary (today)
                </div>
                <div className="field-activity-panel__body">
                  {data.territorySummary.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>No visits today</p>
                  ) : (
                    data.territorySummary.map((row) => (
                      <div key={row.area} className="field-activity-row">
                        <span className="field-activity-row__name">{row.area}</span>
                        <span className="field-activity-row__meta">
                          {row.visits} visit{row.visits === 1 ? "" : "s"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="field-activity-bottom-card">
            <div className="field-activity-bottom-card__head">
              <div className="field-activity-bottom-card__title">
                <Icon name="clock" size={14} />
                Today&apos;s visits
              </div>
            </div>
            <div style={{ padding: "0 1rem 1rem" }}>
              {data.activeVisits.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: "0.75rem 0 0" }}>
                  No active visits scheduled for today.
                </p>
              ) : (
                <table className="dispatch-plan-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Party</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.activeVisits.map((v) => (
                      <tr key={v.id}>
                        <td>{v.assignedEmployeeName}</td>
                        <td>{v.partyName}</td>
                        <td>{v.locationText || "—"}</td>
                        <td>
                          <span className={`field-activity-badge field-activity-badge--${v.status === "pending" ? "delayed" : "field"}`}>
                            {statusLabel(v.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {data.timeline.length > 0 ? (
            <div className="field-activity-bottom-card">
              <div className="field-activity-bottom-card__head">
                <div className="field-activity-bottom-card__title">
                  <Icon name="clock" size={14} />
                  Visit timeline
                </div>
              </div>
              <ul style={{ margin: 0, padding: "0 1rem 1rem", listStyle: "none" }}>
                {data.timeline.map((item, i) => (
                  <li
                    key={`${item.title}-${i}`}
                    style={{
                      padding: "0.65rem 0",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <strong>{item.time}</strong> — {item.title}
                    <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>
                      {item.sub}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
