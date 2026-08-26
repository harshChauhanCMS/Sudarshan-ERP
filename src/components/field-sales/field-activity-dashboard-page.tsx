"use client";

import { useState } from "react";
import { message, Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { Icon } from "@/components/erp/icons";
import { Btn } from "@/components/erp/ui";
import { DashHead } from "@/components/erp/dashboards";
import { FieldEmployeeGoogleMap } from "@/components/field-sales/field-employee-google-map";
import { FieldVisitCreateModal } from "@/components/field-sales/field-visit-create-modal";
import { FieldVisitDetailModal } from "@/components/field-sales/field-visit-detail-modal";
import { useFieldActivityDashboard } from "@/hooks/use-field-activity-dashboard";
import { useSessionUser } from "@/hooks/use-session-user";
import {
  formatVisitDurationMinutes,
  getVisitAcceptToCloseMinutes,
  visitStatusBadgeClass,
  visitStatusLabel,
} from "@/lib/field-visit-display";
import type { FieldVisitView } from "@/lib/field-visit-types";

function badgeClass(badge: string) {
  if (badge === "field" || badge === "onsite") return "field";
  if (badge === "done") return "done";
  if (badge === "delayed") return "delayed";
  return "office";
}

export function FieldActivityDashboardPage() {
  const { data, loading, error, reload } = useFieldActivityDashboard();
  const { user } = useSessionUser();
  const [visitModalOpen, setVisitModalOpen] = useState(false);
  const [viewVisit, setViewVisit] = useState<FieldVisitView | null>(null);
  const canCreateVisit = user?.role === "owner" || user?.role === "admin";

  const handleRefresh = async () => {
    await reload(); // non-silent: shows the loading state for a manual click
    message.success("Refreshed");
  };
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
          value: formatVisitDurationMinutes(data.kpis.avgVisitDurationMinutes),
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
        {canCreateVisit ? (
          <Btn variant="primary" size="sm" icon="plus" onClick={() => setVisitModalOpen(true)}>
            Add visit
          </Btn>
        ) : null}
        <Btn
          variant="secondary"
          size="sm"
          icon={loading ? undefined : "refresh"}
          disabled={loading}
          onClick={() => void handleRefresh()}
        >
          {loading ? <LoadingOutlined spin /> : null} {loading ? "Refreshing…" : "Refresh"}
        </Btn>
      </DashHead>

      <FieldVisitCreateModal
        open={visitModalOpen}
        onClose={() => setVisitModalOpen(false)}
        onCreated={() => void reload(true)}
      />

      <FieldVisitDetailModal visit={viewVisit} onClose={() => setViewVisit(null)} />

      {loading && !data ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: 320, padding: 24 }}>
          <Spin size="large" description="Loading field activity…" />
        </div>
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
                  <FieldEmployeeGoogleMap employees={data.mapEmployees} />
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
                  {/* Onsite attendance is tracked in HRMS reports; this dashboard
                      shows field employees only. */}
                  {data.liveEmployees.filter((row) => row.badge !== "onsite")
                    .length === 0 ? (
                    <p style={{ margin: 0, fontSize: 12, color: "var(--fg-muted)" }}>
                      No field employees checked in right now.
                    </p>
                  ) : (
                    data.liveEmployees
                      .filter((row) => row.badge !== "onsite")
                      .map((row) => (
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
                Today&apos;s visits & employee check-ins
              </div>
            </div>
            <div style={{ padding: "0 1rem 1rem" }}>
              {(data.todayVisits ?? data.activeVisits).length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: "0.75rem 0 0" }}>
                  No visits scheduled or logged for today.
                </p>
              ) : (
                <table className="dispatch-plan-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Party</th>
                      <th>Date</th>
                      <th>Location</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th style={{ width: 72 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {(data.todayVisits ?? data.activeVisits).map((v) => (
                      <tr key={v.id}>
                        <td>{v.assignedEmployeeName}</td>
                        <td>{v.partyName}</td>
                        <td style={{ fontSize: 12 }}>{v.visitDate}</td>
                        <td>{v.locationText || "—"}</td>
                        <td>
                          <span
                            className={`field-activity-badge field-activity-badge--${v.selfInitiated ? "field" : "office"}`}
                          >
                            {v.selfInitiated ? "Self" : "Assigned"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`field-activity-badge field-activity-badge--${visitStatusBadgeClass(v.status)}`}
                          >
                            {visitStatusLabel(v.status)}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                          {formatVisitDurationMinutes(getVisitAcceptToCloseMinutes(v))}
                        </td>
                        <td>
                          <Btn
                            variant="secondary"
                            size="sm"
                            icon="eye"
                            onClick={() => setViewVisit(v)}
                          />
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
