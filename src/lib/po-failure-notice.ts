"use client";

import { buildPoPdf, loadPoLogo, poPdfFileName } from "@/lib/po-pdf";
import type { PurchaseOrder, Vendor } from "@/lib/entity-types";

/**
 * What happens when an invoice is marked Failed: the vendor is told, with the
 * purchase order reprinted and stamped FAILED plus the reason.
 *
 * The address entered on the PO form is used when there is one; without it the
 * stamped PDF is downloaded instead, so it can be sent by hand.
 */

export type FailureNoticeResult =
  | { kind: "emailed"; email: string }
  | { kind: "downloaded"; reason: "no-email" | "email-failed"; detail?: string };

export async function sendPoFailureNotice(opts: {
  po: PurchaseOrder;
  vendor?: Vendor | null;
  invoiceRef?: string;
  reason: string;
}): Promise<FailureNoticeResult> {
  const { po, vendor, invoiceRef, reason } = opts;

  const pdf = buildPoPdf({
    po,
    vendor: vendor ?? null,
    logoDataUrl: await loadPoLogo(),
    failure: { reason, invoiceRef, at: new Date() },
  });
  const fileName = poPdfFileName(po, true);

  const email = (po.vendorEmail ?? "").trim();
  if (!email) {
    pdf.save(fileName);
    return { kind: "downloaded", reason: "no-email" };
  }

  try {
    const res = await fetch(
      `/api/procurement/po/${encodeURIComponent(po.id)}/send-pdf`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          kind: "failed",
          reason,
          invoiceRef,
          fileName,
          pdfBase64: pdf.output("datauristring").split(",")[1] ?? "",
        }),
      },
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Email failed");
    if (!json?.data?.sent) {
      pdf.save(fileName);
      return {
        kind: "downloaded",
        reason: "email-failed",
        detail: json?.data?.reason || "Email is not configured on this server",
      };
    }
    return { kind: "emailed", email };
  } catch (e) {
    // The vendor still has to be told, so the notice is handed over as a file.
    pdf.save(fileName);
    return {
      kind: "downloaded",
      reason: "email-failed",
      detail: e instanceof Error ? e.message : "unknown error",
    };
  }
}
