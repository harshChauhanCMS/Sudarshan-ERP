"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Badge, message } from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  CheckCircleFilled,
  MinusCircleFilled,
  FilterOutlined,
} from "@ant-design/icons";
import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import dayjs from "dayjs";

import { useErpData } from "@/context/erp-data-provider";
import {
  useAttendancePunch,
  type WorkSite,
} from "@/hooks/use-attendance-punch";
import { PUNCH_IN_LATE_ABSENT_MESSAGE } from "@/lib/hrms-shift-utils";

type TodayRow = {
  id: string;
  name: string;
  inTime: string | null;
  outTime: string | null;
  status: string;
  punchLog?: { type: string; isoTime: string }[];
};

export default function AttendancePunchPage() {
  const { data } = useErpData();
  const { punch, punching } = useAttendancePunch({ source: "mobile" });
  const [now, setNow] = useState(dayjs());
  const [companyId, setCompanyId] = useState<string>("");
  const [workSite, setWorkSite] = useState<WorkSite>("office");
  const [draftCompanyId, setDraftCompanyId] = useState<string>("");
  const [draftWorkSite, setDraftWorkSite] = useState<WorkSite>("office");
  const [myRow, setMyRow] = useState<TodayRow | null>(null);
  const [punchInBlocked, setPunchInBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const companies = data.COMPANIES;

  useEffect(() => {
    if (!companyId && companies[0]) {
      const id = companies[0].id;
      setCompanyId(id);
      setDraftCompanyId(id);
    }
  }, [companies, companyId]);

  const handleApplyFilters = () => {
    setCompanyId(draftCompanyId);
    setWorkSite(draftWorkSite);
    void loadToday();
  };

  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadToday = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/attendance/today?mine=1", {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok && !json?.error) {
        const rows: TodayRow[] = json.data?.rows ?? [];
        setMyRow(rows[0] ?? null);
        setPunchInBlocked(Boolean(json.data?.meta?.punchInBlocked));
      }
    } catch {
      /* non-blocking */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadToday();
  }, []);

  const punchInTime = useMemo(() => {
    if (!myRow?.punchLog?.length) return null;
    const ins = myRow.punchLog
      .filter((p) => p.type === "in")
      .sort(
        (a, b) => new Date(a.isoTime).getTime() - new Date(b.isoTime).getTime(),
      );
    return ins[0] ? dayjs(ins[0].isoTime) : null;
  }, [myRow]);

  const punchOutTime = useMemo(() => {
    if (!myRow?.punchLog?.length) return null;
    const outs = myRow.punchLog
      .filter((p) => p.type === "out")
      .sort(
        (a, b) => new Date(b.isoTime).getTime() - new Date(a.isoTime).getTime(),
      );
    return outs[0] ? dayjs(outs[0].isoTime) : null;
  }, [myRow]);

  const canPunchIn = !myRow || myRow.status !== "In";
  const canPunchOut = myRow?.status === "In";

  const handlePunch = async (type: "in" | "out") => {
    if (type === "in" && punchInBlocked) {
      message.error({
        content: PUNCH_IN_LATE_ABSENT_MESSAGE,
        duration: 6,
      });
      return;
    }
    const ok = await punch(type, workSite);
    if (ok) await loadToday();
  };

  const selectedCompany = companies.find((c) => c.id === companyId);

  const statusLabel =
    myRow?.status === "In"
      ? "Punched In"
      : punchOutTime
        ? "Punched Out"
        : "Not Started";
  const statusBadge: "success" | "processing" | "default" =
    myRow?.status === "In"
      ? "success"
      : punchOutTime
        ? "processing"
        : "default";

  return (
    <div className="attendance-reports-page ap-page">
      <RepHeader
        backLabel={HRMS_BACK.dashboard.backLabel}
        backHref={HRMS_BACK.dashboard.backHref}
        title="Attendance"
        subtitle="GPS/location-based punch in and out"
      />

      <div className="ap-layout">
        <div className="ap-layout__main">
          <div className="ap-clock-hero">
            <div className="ap-clock-time">{now.format("HH:mm:ss")}</div>
            <div className="ap-clock-date">{now.format("DD MMM YYYY")}</div>
            <div className="ap-clock-status-wrap">
              <Badge status={statusBadge} />
              <span className="ap-clock-status-text">{statusLabel}</span>
            </div>
          </div>

          {(punchInTime || punchOutTime) && (
            <div className="ap-timeline">
              {punchInTime && (
                <div className="ap-timeline-item ap-timeline-item--in">
                  <CheckCircleFilled className="ap-timeline-icon" />
                  <div>
                    <div className="ap-timeline-label">Punched in</div>
                    <div className="ap-timeline-value">
                      {punchInTime.format("HH:mm")}
                    </div>
                  </div>
                </div>
              )}
              {punchOutTime && (
                <div className="ap-timeline-item ap-timeline-item--out">
                  <MinusCircleFilled className="ap-timeline-icon" />
                  <div>
                    <div className="ap-timeline-label">Punched out</div>
                    <div className="ap-timeline-value">
                      {punchOutTime.format("HH:mm")}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="ap-punch-grid">
            <div
              className={`ap-punch-card ap-punch-card--in${!canPunchIn ? " ap-punch-card--done" : ""}`}
            >
              <div className="ap-punch-card__icon">
                <LoginOutlined />
              </div>
              <div className="ap-punch-card__label">Punch In</div>
              <div className="ap-punch-card__time">
                {punchInTime ? punchInTime.format("HH:mm") : "—"}
              </div>
              {punchInBlocked && canPunchIn ? (
                <p className="ap-punch-card__warning">
                  Absent marked for today — late by 4+ hours. Contact HR.
                </p>
              ) : null}
              <Button
                type="primary"
                size="large"
                block
                className="ap-punch-btn ap-punch-btn--in"
                icon={<LoginOutlined />}
                loading={punching === "in"}
                disabled={!canPunchIn || loading}
                onClick={() => handlePunch("in")}
              >
                {punchInTime ? "Punched In" : "Punch In"}
              </Button>
            </div>

            <div
              className={`ap-punch-card ap-punch-card--out${!canPunchOut ? " ap-punch-card--disabled" : ""}`}
            >
              <div className="ap-punch-card__icon">
                <LogoutOutlined />
              </div>
              <div className="ap-punch-card__label">Punch Out</div>
              <div className="ap-punch-card__time">
                {punchOutTime ? punchOutTime.format("HH:mm") : "—"}
              </div>
              <Button
                type="primary"
                size="large"
                block
                className="ap-punch-btn ap-punch-btn--out"
                icon={<LogoutOutlined />}
                loading={punching === "out"}
                disabled={!canPunchOut || loading}
                onClick={() => handlePunch("out")}
              >
                Punch Out
              </Button>
            </div>
          </div>
        </div>

        <div className="ap-layout__side">
          <div className="arf-panel ap-filters-panel">
            <div className="arf-head">
              <FilterOutlined style={{ color: "var(--primary)", fontSize: 12 }} />
              <span className="arf-head-title">Filters</span>
            </div>
            <div className="arf-body">
              <div className="arf-controls ap-filters-controls ap-filters-controls--split-apply">
                <div className="arf-item">
                  <span className="arf-label">Company / unit</span>
                  <Select
                    className="w-full"
                    value={draftCompanyId || undefined}
                    onChange={setDraftCompanyId}
                    options={companies.map((c) => ({
                      value: c.id,
                      label: `${c.name} (${c.plant})`,
                    }))}
                  />
                </div>
                <div className="arf-item">
                  <span className="arf-label">Work site</span>
                  <Select
                    className="w-full"
                    value={draftWorkSite}
                    onChange={setDraftWorkSite}
                    options={[
                      { value: "office", label: "In office / plant" },
                      { value: "field", label: "Field" },
                    ]}
                  />
                </div>
                <div className="ap-filters-row-break" aria-hidden="true" />
                <div className="arf-item ap-filters-actions">
                  <Button
                    type="primary"
                    icon={<FilterOutlined />}
                    loading={loading}
                    onClick={handleApplyFilters}
                  >
                    Apply filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="ap-info">
            <EnvironmentOutlined className="ap-info__icon" />
            <p className="ap-info__text">
              <strong>GPS-verified attendance.</strong> Punch in/out from{" "}
              <strong>{selectedCompany?.name ?? "your office"}</strong> or an
              approved site. Field staff should select <strong>Field</strong>{" "}
              when working off-site.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
