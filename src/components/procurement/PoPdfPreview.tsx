"use client";

import { useCallback } from "react";

import PdfPreview from "@/components/common/PdfPreview";
import { buildPoPdf, poPdfFileName, type PoPdfInput } from "@/lib/po-pdf";

/** The purchase-order document in the shared PDF viewer. */
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
  const build = useCallback(() => buildPoPdf(input!), [input]);

  return (
    <PdfPreview
      build={input ? build : null}
      fileName={input ? poPdfFileName(input.po, Boolean(input.failure)) : ""}
      title={input ? `Purchase order ${input.po.id}` : "Purchase order"}
      open={open}
      onClose={onClose}
    />
  );
}
