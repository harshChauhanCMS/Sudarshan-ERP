import React from "react";
import { Modal, Descriptions, Divider, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmt = (n: number | undefined) =>
  `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type SalaryRow = {
  _id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation?: string;
  grossSalary: number;
  netPayable: number;
  status: string;
  workingDays: number;
  daysPresent: number;
  leaveDays?: number;
  unpaidLeaveDays?: number;
  leaveDeduction: number;
  pfEmployee: number;
  pfEmployer: number;
  esi: number;
  tds: number;
  overtimeHours: number;
  overtimeAmount: number;
  basicSalary?: number;
  da?: number;
  hra?: number;
  otherConveyance?: number;
  specialBonus?: number;
  otherDeductions?: number;
  cycle?: string;
};

interface PayslipModalProps {
  open: boolean;
  onClose: () => void;
  salarySheet: SalaryRow | null;
}

export default function PayslipModal({ open, onClose, salarySheet }: PayslipModalProps) {
  if (!salarySheet) return null;

  const monthLabel = salarySheet.cycle
    ? dayjs(salarySheet.cycle, "YYYY-MM").format("MMMM YYYY")
    : "";

  const handleDownloadPdf = () => {
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.text("Sudarshan Microns", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Payslip for the month of ${monthLabel}`, 105, 28, { align: "center" });

    autoTable(doc, {
      startY: 40,
      theme: "plain",
      body: [
        [{ content: "Employee ID:", styles: { fontStyle: "bold" } }, salarySheet.employeeId, { content: "Department:", styles: { fontStyle: "bold" } }, salarySheet.department || "—"],
        [{ content: "Employee Name:", styles: { fontStyle: "bold" } }, salarySheet.employeeName, { content: "Designation:", styles: { fontStyle: "bold" } }, salarySheet.designation || "—"],
        [{ content: "Total Working Days:", styles: { fontStyle: "bold" } }, salarySheet.workingDays, { content: "Days Present:", styles: { fontStyle: "bold" } }, salarySheet.daysPresent],
      ],
      styles: { fontSize: 10, cellPadding: 2 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    const deductionsTotal = (salarySheet.pfEmployee || 0) + (salarySheet.esi || 0) + (salarySheet.tds || 0) + (salarySheet.leaveDeduction || 0) + (salarySheet.otherDeductions || 0);
    const grossTotal = salarySheet.grossSalary + (salarySheet.overtimeAmount || 0);

    autoTable(doc, {
      startY: finalY,
      theme: "grid",
      head: [["Earnings", "Amount", "Deductions", "Amount"]],
      body: [
        ["Basic Salary", fmt(salarySheet.basicSalary), "PF (Employee)", fmt(salarySheet.pfEmployee)],
        ["DA", fmt(salarySheet.da), "ESI", fmt(salarySheet.esi)],
        ["HRA", fmt(salarySheet.hra), "TDS", fmt(salarySheet.tds)],
        ["Conveyance", fmt(salarySheet.otherConveyance), "Leave Deduction", fmt(salarySheet.leaveDeduction)],
        ["Special Bonus", fmt(salarySheet.specialBonus), "Other Deductions", fmt(salarySheet.otherDeductions)],
        ["Overtime", fmt(salarySheet.overtimeAmount), "", ""],
        [
          { content: "Gross Earnings", styles: { fontStyle: "bold" } }, 
          { content: fmt(grossTotal), styles: { fontStyle: "bold" } }, 
          { content: "Total Deductions", styles: { fontStyle: "bold" } }, 
          { content: fmt(deductionsTotal), styles: { fontStyle: "bold" } }
        ]
      ],
      headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: "bold" },
      styles: { fontSize: 10 }
    });

    const yAfterTable = (doc as any).lastAutoTable.finalY + 15;

    doc.setFillColor(235, 248, 240);
    doc.rect(14, yAfterTable, 182, 16, "F");

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 139, 34); // success green
    doc.text("Net Payable", 18, yAfterTable + 11);
    doc.text(fmt(salarySheet.netPayable), 190, yAfterTable + 11, { align: "right" });

    doc.save(`Payslip_${salarySheet.employeeName.replace(/\s+/g, '_')}_${salarySheet.cycle}.pdf`);
  };

  return (
    <Modal
      open={open}
      centered
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button key="download" icon={<DownloadOutlined />} type="primary" onClick={handleDownloadPdf}>
          Download PDF
        </Button>,
      ]}
      width={800}
      title={null}
      destroyOnClose
    >
      <div className="payslip-container" style={{ padding: "20px 10px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Sudarshan Microns</h2>
          <p style={{ margin: 0, color: "var(--fg-muted)" }}>Payslip for the month of {monthLabel}</p>
        </div>

        <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Employee ID">
            <span className="font-mono font-medium">{salarySheet.employeeId}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Employee Name">
            <span className="font-semibold">{salarySheet.employeeName}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Department">{salarySheet.department || "—"}</Descriptions.Item>
          <Descriptions.Item label="Designation">{salarySheet.designation || "—"}</Descriptions.Item>
          <Descriptions.Item label="Total Working Days">{salarySheet.workingDays}</Descriptions.Item>
          <Descriptions.Item label="Days Present">
            {salarySheet.daysPresent} 
            <span style={{ fontSize: 12, color: "var(--fg-subtle)", marginLeft: 8 }}>
              (Leaves: {salarySheet.leaveDays || 0}, Unpaid: {salarySheet.unpaidLeaveDays || 0})
            </span>
          </Descriptions.Item>
        </Descriptions>

        <div style={{ display: "flex", gap: 24 }}>
          {/* Earnings */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: "2px solid var(--border)", paddingBottom: 8, marginBottom: 12 }}>Earnings</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Basic Salary</span>
              <span className="font-medium">{fmt(salarySheet.basicSalary)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>DA</span>
              <span className="font-medium">{fmt(salarySheet.da)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>HRA</span>
              <span className="font-medium">{fmt(salarySheet.hra)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Conveyance</span>
              <span className="font-medium">{fmt(salarySheet.otherConveyance)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>Special Bonus</span>
              <span className="font-medium">{fmt(salarySheet.specialBonus)}</span>
            </div>
            {salarySheet.overtimeAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Overtime ({salarySheet.overtimeHours}h)</span>
                <span className="font-medium">{fmt(salarySheet.overtimeAmount)}</span>
              </div>
            )}
            <Divider style={{ margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
              <span>Gross Earnings</span>
              <span>{fmt(salarySheet.grossSalary + (salarySheet.overtimeAmount || 0))}</span>
            </div>
          </div>

          {/* Deductions */}
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: "2px solid var(--border)", paddingBottom: 8, marginBottom: 12 }}>Deductions</h3>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>PF (Employee)</span>
              <span className="font-medium">{fmt(salarySheet.pfEmployee)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>ESI</span>
              <span className="font-medium">{fmt(salarySheet.esi)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>TDS</span>
              <span className="font-medium">{fmt(salarySheet.tds)}</span>
            </div>
            {salarySheet.leaveDeduction > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--danger)" }}>
                <span>Leave Deduction</span>
                <span className="font-medium">{fmt(salarySheet.leaveDeduction)}</span>
              </div>
            )}
            {salarySheet.otherDeductions! > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span>Other Deductions</span>
                <span className="font-medium">{fmt(salarySheet.otherDeductions)}</span>
              </div>
            )}
            <Divider style={{ margin: "12px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 15 }}>
              <span>Total Deductions</span>
              <span>
                {fmt(
                  (salarySheet.pfEmployee || 0) +
                  (salarySheet.esi || 0) +
                  (salarySheet.tds || 0) +
                  (salarySheet.leaveDeduction || 0) +
                  (salarySheet.otherDeductions || 0)
                )}
              </span>
            </div>
          </div>
        </div>

        <div style={{ 
          marginTop: 24, 
          padding: 16, 
          background: "var(--success-soft)", 
          borderRadius: 8, 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          border: "1px solid var(--success-border)"
        }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: "var(--success-text)" }}>Net Payable</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: "var(--success-text)", letterSpacing: "-0.02em" }}>
            {fmt(salarySheet.netPayable)}
          </span>
        </div>
      </div>
    </Modal>
  );
}
