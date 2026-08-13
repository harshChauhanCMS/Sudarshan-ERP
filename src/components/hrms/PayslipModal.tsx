import { Modal, Button } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

import { SalarySlipCard, downloadSalarySlipPdf, type SalarySlipData } from "./SalarySlip";

interface PayslipModalProps {
  open: boolean;
  onClose: () => void;
  salarySheet: SalarySlipData | null;
}

export default function PayslipModal({ open, onClose, salarySheet }: PayslipModalProps) {
  if (!salarySheet) return null;

  return (
    <Modal
      open={open}
      centered
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          type="primary"
          onClick={() => void downloadSalarySlipPdf(salarySheet)}
        >
          Download PDF
        </Button>,
      ]}
      width={800}
      title={null}
      destroyOnClose
    >
      <SalarySlipCard salarySheet={salarySheet} />
    </Modal>
  );
}
