"use client";

import { useEffect, useMemo } from "react";
import { Modal, Spin } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { jsPDF } from "jspdf";

import { Btn } from "@/components/erp/ui";

/**
 * Shows a generated PDF on screen, with the download beside it.
 *
 * The document is built once per open and handed to the viewer as a blob URL,
 * which is revoked on close so a long session does not leak them. The build is
 * derived state, not an effect, so nothing cascades.
 */
export default function PdfPreview({
  build,
  fileName,
  title,
  open,
  onClose,
}: {
  /** Builds the document; null while there is nothing to show. */
  build: (() => jsPDF) | null;
  fileName: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const built = useMemo(() => {
    if (!open || !build) return { url: null as string | null, failed: false };
    try {
      const blob = build().output("blob") as Blob;
      return { url: URL.createObjectURL(blob), failed: false };
    } catch {
      return { url: null as string | null, failed: true };
    }
  }, [open, build]);

  useEffect(
    () => () => {
      if (built.url) URL.revokeObjectURL(built.url);
    },
    [built.url],
  );

  const download = () => {
    if (!built.url) return;
    const link = document.createElement("a");
    link.href = built.url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      destroyOnHidden
      title={title}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{fileName}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" size="sm" onClick={onClose}>
              Close
            </Btn>
            <Btn variant="primary" size="sm" onClick={download} disabled={!built.url}>
              <DownloadOutlined /> Download PDF
            </Btn>
          </div>
        </div>
      }
    >
      <div className="po-pdf-preview">
        {built.failed ? (
          <p className="danger" style={{ margin: 0 }}>
            Could not generate the PDF.
          </p>
        ) : built.url ? (
          <iframe src={built.url} title={fileName} className="po-pdf-preview__frame" />
        ) : (
          <div className="po-pdf-preview__loading">
            <Spin />
          </div>
        )}
      </div>
    </Modal>
  );
}
