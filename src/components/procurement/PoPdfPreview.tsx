"use client";

import { useEffect, useMemo } from "react";
import { Modal, Spin } from "antd";
import { DownloadOutlined } from "@ant-design/icons";

import { Btn } from "@/components/erp/ui";
import { buildPoPdf, poPdfFileName, type PoPdfInput } from "@/lib/po-pdf";

/**
 * Shows a purchase order on screen before anyone commits to saving it: the
 * real PDF, rendered in place, with the download beside it.
 *
 * The document is built once per open and handed to the viewer as a blob URL,
 * which is revoked on close so a long session does not leak them.
 */
export default function PoPdfPreview({
  input,
  open,
  onClose,
}: {
  /** null while nothing is selected — the modal stays closed. */
  input: PoPdfInput | null;
  open: boolean;
  onClose: () => void;
}) {
  // The document is derived from the input, so it is built as derived state
  // and the effect only cleans the blob URL up — nothing is set from inside it.
  const built = useMemo(() => {
    if (!open || !input) return { url: null as string | null, failed: false };
    try {
      const blob = buildPoPdf(input).output("blob") as Blob;
      return { url: URL.createObjectURL(blob), failed: false };
    } catch {
      return { url: null as string | null, failed: true };
    }
  }, [open, input]);

  useEffect(
    () => () => {
      if (built.url) URL.revokeObjectURL(built.url);
    },
    [built.url],
  );

  const url = built.url;

  const fileName = input ? poPdfFileName(input.po, Boolean(input.failure)) : "";

  const download = () => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
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
      title={input ? `Purchase order ${input.po.id}` : "Purchase order"}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{fileName}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" size="sm" onClick={onClose}>
              Close
            </Btn>
            <Btn variant="primary" size="sm" onClick={download} disabled={!url}>
              <DownloadOutlined /> Download PDF
            </Btn>
          </div>
        </div>
      }
    >
      <div className="po-pdf-preview">
        {built.failed ? (
          <p className="danger" style={{ margin: 0 }}>
            Could not generate the purchase order PDF.
          </p>
        ) : url ? (
          <iframe src={url} title={fileName} className="po-pdf-preview__frame" />
        ) : (
          <div className="po-pdf-preview__loading">
            <Spin />
          </div>
        )}
      </div>
    </Modal>
  );
}
