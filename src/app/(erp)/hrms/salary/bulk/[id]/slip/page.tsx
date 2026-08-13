"use client";

import { Suspense, use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Button, Spin, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import RepHeader from "@/components/hrms/RepHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";
import {
  SalarySlipCard,
  downloadSalarySlipPdf,
  type SalarySlipData,
} from "@/components/hrms/SalarySlip";

function SalarySlipContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const cycle = searchParams.get("cycle") || dayjs().format("YYYY-MM");

  const [sheet, setSheet] = useState<SalarySlipData | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hrms/salary/${encodeURIComponent(id)}?cycle=${encodeURIComponent(cycle)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load salary slip");
      if (!json.data?.sheet) throw new Error("Salary sheet not found");
      setSheet(json.data.sheet as SalarySlipData);
      setPending(Boolean(json.data?.pending));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load salary slip");
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [id, cycle]);

  useEffect(() => {
    void load();
  }, [load]);

  const cycleLabel = dayjs(cycle, "YYYY-MM", true).isValid()
    ? dayjs(cycle, "YYYY-MM").format("MMMM YYYY")
    : cycle;

  if (loading) {
    return (
      <div className="emp-details-page__loading">
        <Spin size="large" description="Loading salary slip…" />
      </div>
    );
  }

  return (
    <div className="attendance-reports-page">
      <RepHeader
        {...HRMS_BACK.salary}
        backHref={`/hrms/salary/bulk?cycle=${encodeURIComponent(cycle)}`}
        backLabel="Payroll sheet"
        title="Salary slip"
        subtitle={sheet ? `${sheet.employeeName} · ${sheet.employeeId} · ${cycleLabel}` : cycleLabel}
        actions={
          sheet && !pending ? (
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => void downloadSalarySlipPdf(sheet)}
              style={{ background: "#16a34a", border: "none" }}
            >
              Download PDF
            </Button>
          ) : null
        }
      />

      <div className="salary-edit-page__main">
        <div className="salary-edit-page__card">
          {!sheet && (
            <Alert type="error" showIcon message="Salary slip not found" />
          )}
          {sheet && pending && (
            <Alert
              type="info"
              showIcon
              message="Salary not generated yet"
              description="This employee doesn't have a salary slip for this cycle. Generate salary from the payroll sheet first."
            />
          )}
          {sheet && !pending && <SalarySlipCard salarySheet={sheet} />}
        </div>
      </div>
    </div>
  );
}

export default function SalarySlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="emp-details-page__loading">
          <Spin size="large" description="Loading salary slip…" />
        </div>
      }
    >
      <SalarySlipContent params={params} />
    </Suspense>
  );
}
