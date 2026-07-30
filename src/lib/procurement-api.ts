"use client";

import type { Invoice, PurchaseOrder } from "@/lib/entity-types";
import type { InvoiceMatch } from "@/lib/procurement-workflow";

async function send<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json.data as T;
}

const enc = encodeURIComponent;

// --- purchase orders -------------------------------------------------------

export function sendPoToVendor(id: string) {
  return send<{ item: PurchaseOrder }>(`/api/procurement/po/${enc(id)}/send`, {
    method: "PATCH",
    body: JSON.stringify({}),
  });
}

export function recordVendorResponse(id: string, accepted: boolean, note = "") {
  return send<{ item: PurchaseOrder }>(
    `/api/procurement/po/${enc(id)}/vendor-response`,
    { method: "PATCH", body: JSON.stringify({ accepted, note }) },
  );
}

// --- invoices --------------------------------------------------------------

export function fetchInvoices(params: { status?: string; po?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.po) qs.set("po", params.po);
  const query = qs.toString();
  return send<Invoice[]>(
    `/api/procurement/invoices${query ? `?${query}` : ""}`,
    { method: "GET", cache: "no-store" },
  );
}

export function fetchInvoiceDetail(id: string) {
  return send<{ invoice: Invoice; po: PurchaseOrder | null; match: InvoiceMatch }>(
    `/api/procurement/invoices/${enc(id)}`,
    { method: "GET", cache: "no-store" },
  );
}

export type RaiseInvoicePayload = {
  poId: string;
  invAmt: number | string;
  vendorInvoiceNo?: string;
  invDate?: string;
  notes?: string;
};

export function raiseInvoice(payload: RaiseInvoicePayload) {
  return send<{ invoice: Invoice; po: PurchaseOrder }>(
    "/api/procurement/invoices",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function verifyInvoice(id: string, note = "") {
  return send<{ invoice: Invoice }>(
    `/api/procurement/invoices/${enc(id)}/verify`,
    { method: "PATCH", body: JSON.stringify({ note }) },
  );
}

export function markInvoiceMismatch(id: string, note: string) {
  return send<{ invoice: Invoice }>(
    `/api/procurement/invoices/${enc(id)}/mismatch`,
    { method: "PATCH", body: JSON.stringify({ note }) },
  );
}

export function resubmitInvoice(
  id: string,
  payload: { invAmt?: number | string; vendorInvoiceNo?: string; notes?: string },
) {
  return send<{ invoice: Invoice }>(
    `/api/procurement/invoices/${enc(id)}/resubmit`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}
