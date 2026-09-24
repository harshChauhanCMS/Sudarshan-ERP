"use client";

import { useCallback } from "react";

import PdfPreview from "@/components/common/PdfPreview";
import { buildInvoicePdf, invoicePdfFileName, type InvoicePdfInput } from "@/lib/invoice-pdf";

/** The vendor invoice — carrying its GRN once verified — in the shared viewer. */
export default function InvoicePdfPreview({
  input,
  open,
  onClose,
}: {
  input: InvoicePdfInput | null;
  open: boolean;
  onClose: () => void;
}) {
  const build = useCallback(() => buildInvoicePdf(input!), [input]);

  return (
    <PdfPreview
      build={input ? build : null}
      fileName={input ? invoicePdfFileName(input.invoice) : ""}
      title={
        input
          ? `Invoice ${input.invoice.vendorInvoiceNo || input.invoice.id}${
              input.invoice.grnNo ? ` · ${input.invoice.grnNo}` : ""
            }`
          : "Invoice"
      }
      open={open}
      onClose={onClose}
    />
  );
}
