"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Select, Badge } from "antd";
import {
  LoginOutlined,
  LogoutOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  CheckCircleFilled,
  MinusCircleFilled,
} from "@ant-design/icons";
import Link from "next/link";
import HrmsBackLink from "@/components/hrms/HrmsBackLink";
import { HRMS_BACK } from "@/lib/hrms-nav";
import dayjs from "dayjs";

import { useErpData } from "@/context/erp-data-provider";
import {
  useAttendancePunch,
  type WorkSite,
} from "@/hooks/use-attendance-punch";

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
  const [myRow, setMyRow] = useState<TodayRow | null>(null);
  const [loading, setLoading] = useState(true);

  const companies = data.COMPANIES;

  useEffect(() => {
    if (!companyId && companies[0]) setCompanyId(companies[0].id);
  }, [companies, companyId]);

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
        (a, b) =>
          new Date(a.isoTime).getTime() - new Date(b.isoTime).getTime()
      );
    return ins[0] ? dayjs(ins[0].isoTime) : null;
  }, [myRow]);

  const punchOutTime = useMemo(() => {
    if (!myRow?.punchLog?.length) return null;
    const outs = myRow.punchLog
      .filter((p) => p.type === "out")
      .sort(
        (a, b) =>
          new Date(b.isoTime).getTime() - new Date(a.isoTime).getTime()
      );
    return outs[0] ? dayjs(outs[0].isoTime) : null;
  }, [myRow]);

  const canPunchIn = !myRow || myRow.status !== "In";
  const canPunchOut = myRow?.status === "In";

  const handlePunch = async (type: "in" | "out") => {
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
    myRow?.status === "In" ? "success" : punchOutTime ? "processing" : "default";

  return (
    <div className="ap-page">
      <div className="ap-inner">
        <HrmsBackLink
          href={HRMS_BACK.dashboard.backHref}
          label={HRMS_BACK.dashboard.backLabel}
        />
        <div className="ap-header">
          <div className="ap-header__left">
            <div className="ap-header__title">
              <ClockCircleOutlined className="ap-header__icon" />
              Attendance
            </div>
            <div className="ap-header__sub">GPS/location-based punch in and out</div>
          </div>
          <div className="ap-header__actions">
            <Link href="/hrms/reports">
              <Button icon={<BarChartOutlined />}>Reports</Button>
            </Link>
            <Link href="/hrms/employees">
              <Button icon={<TeamOutlined />}>Employees</Button>
            </Link>
          </div>
        </div>

        {/* Live clock hero */}
        <div className="ap-clock-hero">
          <div className="ap-clock-time">{now.format("HH:mm:ss")}</div>
          <div className="ap-clock-date">{now.format("DD MMM YYYY")}</div>
          <div className="ap-clock-status-wrap">
            <Badge status={statusBadge} />
            <span className="ap-clock-status-text">{statusLabel}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="ap-filters">
          <div className="ap-filter-item">
            <label className="ap-filter-label">Company / Unit</label>
            <Select
              className="w-full"
              value={companyId || undefined}
              onChange={setCompanyId}
              options={companies.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.plant})`,
              }))}
            />
          </div>
          <div className="ap-filter-item">
            <label className="ap-filter-label">Work Site</label>
            <Select
              className="w-full"
              value={workSite}
              onChange={setWorkSite}
              options={[
                { value: "office", label: "In office / plant" },
                { value: "field", label: "Field" },
              ]}
            />
          </div>
        </div>

        {/* Punch timeline — only shown once punched */}
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

        {/* Punch action cards */}
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

        {/* Info strip */}
        <div className="ap-info">
          <EnvironmentOutlined className="ap-info__icon" />
          <p className="ap-info__text">
            <strong>GPS-verified attendance.</strong> Punch in/out from{" "}
            <strong>{selectedCompany?.name ?? "your office"}</strong> or an
            approved site. Field staff should select <strong>Field</strong> when
            working off-site.
          </p>
        </div>
      </div>
    </div>
  );
}
