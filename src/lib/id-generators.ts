type WithId = { id?: string; code?: string };

function maxNumericSuffix(items: WithId[], prefix: string, pad = 3): number {
  let max = 0;
  for (const item of items) {
    const key = item.id ?? item.code ?? "";
    const m = key.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

export function nextCustomerId(customers: WithId[]) {
  const n = maxNumericSuffix(customers, "C");
  return `C-${String(n).padStart(3, "0")}`;
}

export function nextOrderId(orders: WithId[]) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const o of orders) {
    const m = (o.id ?? "").match(/^SO-\d{4}-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `SO-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function nextPoId(pos: WithId[]) {
  const year = new Date().getFullYear();
  let max = 0;
  for (const p of pos) {
    const m = (p.id ?? "").match(/^PO-\d{4}-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PO-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function nextVendorId(vendors: WithId[]) {
  const n = maxNumericSuffix(vendors, "V");
  return `V-${String(n).padStart(3, "0")}`;
}

export function nextDispatchId(dispatches: WithId[]) {
  let max = 0;
  for (const d of dispatches) {
    const m = (d.id ?? "").match(/^DSP-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `DSP-${max + 1}`;
}

export function nextFieldVisitId(visits: WithId[]) {
  let max = 0;
  for (const v of visits) {
    const m = (v.id ?? "").match(/^FV-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `FV-${max + 1}`;
}

export function nextEmployeeId(employees: WithId[]) {
  let max = 2013;
  for (const e of employees) {
    const m = (e.id ?? "").match(/^E-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `E-${max + 1}`;
}

/** Next HRMS employee code (EMP-3001, EMP-3011, …) from existing records */
export function nextHrmsEmployeeId(employees: { employeeId?: string }[]) {
  const floor = 3000;
  let max = floor;
  for (const e of employees) {
    const id = (e.employeeId ?? "").trim().toUpperCase();
    const m = id.match(/^EMP-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `EMP-${max + 1}`;
}

export function nextInvoiceId(invoices: WithId[]) {
  const n = invoices.length + 1;
  const stamp = String(Date.now()).slice(-4);
  return `INV-NEW-${stamp}-${n}`;
}

export function nextSpareCode(parts: WithId[]) {
  const n = parts.length + 1;
  return `SP-NEW-${String(n).padStart(3, "0")}`;
}

export function nextRawMaterialCode(items: WithId[]) {
  const n = items.length + 1;
  return `RM-NEW-${String(n).padStart(3, "0")}`;
}

export function nextPackagingCode(items: WithId[]) {
  const n = items.length + 1;
  return `PK-NEW-${String(n).padStart(3, "0")}`;
}

export function formatDueDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function formatDisplayDate(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
