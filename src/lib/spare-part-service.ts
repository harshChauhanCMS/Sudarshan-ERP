import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { EntityStore } from "@/models/EntityStore";
import SparePartModel from "@/lib/models/SparePart";
import SparePartIssueModel from "@/lib/models/SparePartIssue";
import type { SparePart, SparePartIssue } from "@/lib/entity-types";

type SparePartDoc = {
  code: string;
  name: string;
  vendor: string;
  category: string;
  stock: number;
  unit: string;
  reorder: number;
  value: number;
  location: string;
  status: string;
  trend: number;
  critical: boolean;
  lastIssued: string;
  lastIssuedAt?: Date | string | null;
  machineName?: string;
  standardRate?: number;
  criticality?: string;
  notes?: string;
};

function toDTO(doc: SparePartDoc): SparePart {
  return {
    code: doc.code,
    name: doc.name,
    vendor: doc.vendor,
    category: doc.category,
    stock: doc.stock,
    unit: doc.unit,
    reorder: doc.reorder,
    value: doc.value,
    location: doc.location,
    status: doc.status,
    trend: doc.trend,
    critical: doc.critical,
    lastIssued: doc.lastIssued,
    lastIssuedAt: doc.lastIssuedAt
      ? new Date(doc.lastIssuedAt).toISOString()
      : null,
    machineName: doc.machineName,
    standardRate: doc.standardRate,
    criticality: doc.criticality,
    notes: doc.notes,
  };
}

function friendlyError(e: unknown): Error {
  if (e instanceof mongoose.Error.ValidationError) {
    const first = Object.values(e.errors)[0];
    return new Error(first?.message ?? "Validation failed.");
  }
  if (
    e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: number }).code === 11000
  ) {
    return new Error("Part code already exists.");
  }
  return e instanceof Error ? e : new Error("Unexpected error.");
}

/** One-time best-effort migration from the old generic entity-store blob, if present. */
async function migrateLegacyIfEmpty() {
  const count = await SparePartModel.estimatedDocumentCount();
  if (count > 0) return;

  const legacy = await EntityStore.findOne({ key: "spareParts" }).lean();
  const items = (legacy?.items as Record<string, unknown>[] | undefined) ?? [];
  if (!items.length) return;

  try {
    await SparePartModel.insertMany(items, { ordered: false });
  } catch {
    // Best-effort: legacy rows failing current validation are dropped.
  }
}

/** Generates the next `SP-NEW-###` code from the live collection (not a stale client list). */
async function generateSparePartCode(): Promise<string> {
  const docs = await SparePartModel.find(
    { code: /^SP-NEW-\d+$/ },
    { code: 1 },
  ).lean();
  let max = 0;
  for (const doc of docs) {
    const match = /^SP-NEW-(\d+)$/.exec(doc.code);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `SP-NEW-${String(max + 1).padStart(3, "0")}`;
}

export async function listSpareParts(): Promise<SparePart[]> {
  await connectDB();
  await migrateLegacyIfEmpty();
  const docs = await SparePartModel.find({}).sort({ createdAt: -1 }).lean();
  return (docs as unknown as SparePartDoc[]).map(toDTO);
}

export async function getSparePartByCode(code: string): Promise<SparePart | null> {
  await connectDB();
  const doc = await SparePartModel.findOne({
    code: code.trim().toUpperCase(),
  }).lean();
  return doc ? toDTO(doc as unknown as SparePartDoc) : null;
}

export async function createSparePart(
  input: Record<string, unknown>,
): Promise<SparePart> {
  await connectDB();
  try {
    const code =
      typeof input.code === "string" && input.code.trim()
        ? input.code
        : await generateSparePartCode();
    const doc = await SparePartModel.create({ ...input, code });
    return toDTO(doc.toObject());
  } catch (e) {
    throw friendlyError(e);
  }
}

export async function updateSparePartByCode(
  code: string,
  patch: Record<string, unknown>,
): Promise<SparePart> {
  await connectDB();
  const doc = await SparePartModel.findOne({ code: code.trim().toUpperCase() });
  if (!doc) throw new Error(`Record not found: ${code}`);

  const rest = { ...patch };
  delete rest.code;
  // Derived from the issue ledger — a master-data edit must never move it.
  delete rest.lastIssuedAt;
  Object.assign(doc, rest);

  try {
    await doc.save();
  } catch (e) {
    throw friendlyError(e);
  }
  return toDTO(doc.toObject());
}

export async function deleteSparePartByCode(code: string): Promise<void> {
  await connectDB();
  const res = await SparePartModel.findOneAndDelete({
    code: code.trim().toUpperCase(),
  });
  if (!res) throw new Error(`Record not found: ${code}`);
}

/** Bulk replace — used by the generic entity-store bulk PATCH and by seeding. */
export async function replaceAllSpareParts(items: unknown[]): Promise<void> {
  await connectDB();
  await SparePartModel.deleteMany({});
  if (Array.isArray(items) && items.length) {
    await SparePartModel.insertMany(items, { ordered: true });
  }
}

/* ============================================================
   ISSUE LEDGER — the outbound transactions behind `lastIssuedAt`
   ============================================================ */

type SparePartIssueDoc = {
  _id: mongoose.Types.ObjectId;
  partCode: string;
  qty: number;
  unit: string;
  machineId: string;
  issuedTo: string;
  workOrder: string;
  rateAtIssue: number;
  issuedAt: Date;
  issuedBy: string;
  notes: string;
};

function toIssueDTO(doc: SparePartIssueDoc): SparePartIssue {
  return {
    id: String(doc._id),
    partCode: doc.partCode,
    qty: doc.qty,
    unit: doc.unit,
    machineId: doc.machineId,
    issuedTo: doc.issuedTo,
    workOrder: doc.workOrder,
    rateAtIssue: doc.rateAtIssue,
    issuedAt: new Date(doc.issuedAt).toISOString(),
    issuedBy: doc.issuedBy,
    notes: doc.notes,
  };
}

/**
 * Recomputes `lastIssuedAt` from the newest surviving issue and re-saves the
 * master doc so the schema hook refreshes status/value. Reading the max back out
 * of the ledger (rather than trusting the issue we just wrote) keeps the field
 * correct when an issue is back-dated or reversed.
 */
async function syncLastIssued(
  doc: mongoose.Document & { lastIssuedAt?: Date | null },
  partCode: string,
): Promise<void> {
  const newest = await SparePartIssueModel.findOne({ partCode })
    .sort({ issuedAt: -1 })
    .select({ issuedAt: 1 })
    .lean();
  doc.lastIssuedAt = (newest as { issuedAt?: Date } | null)?.issuedAt ?? null;
  await doc.save();
}

export async function listSparePartIssues(
  code: string,
  limit = 50,
): Promise<SparePartIssue[]> {
  await connectDB();
  const docs = await SparePartIssueModel.find({
    partCode: code.trim().toUpperCase(),
  })
    .sort({ issuedAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 200))
    .lean();
  return (docs as unknown as SparePartIssueDoc[]).map(toIssueDTO);
}

/**
 * Records one outbound issue: decrements stock under a `$gte` guard so two
 * concurrent issues can never drive the rack negative, writes the ledger row,
 * then re-derives `lastIssuedAt`, `status` and `value`.
 */
export async function issueSparePart(
  code: string,
  input: Record<string, unknown>,
  issuedBy: string,
): Promise<{ item: SparePart; issue: SparePartIssue }> {
  await connectDB();
  const partCode = code.trim().toUpperCase();

  const qty = Number(input.qty);
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Issue quantity must be greater than zero.");
  }

  const issuedTo = typeof input.issuedTo === "string" ? input.issuedTo.trim() : "";
  if (!issuedTo) throw new Error("Issued to is required.");

  const issuedAt = input.issuedAt ? new Date(String(input.issuedAt)) : new Date();
  if (Number.isNaN(issuedAt.getTime())) throw new Error("Invalid issue date.");
  // A minute of slack absorbs client/server clock skew.
  if (issuedAt.getTime() > Date.now() + 60_000) {
    throw new Error("Issue date cannot be in the future.");
  }

  const part = await SparePartModel.findOne({ code: partCode });
  if (!part) throw new Error(`Record not found: ${code}`);

  // Atomic guarded decrement — the filter is the oversell check.
  const updated = await SparePartModel.findOneAndUpdate(
    { code: partCode, stock: { $gte: qty } },
    { $inc: { stock: -qty } },
    { new: true },
  );
  if (!updated) {
    throw new Error(
      `Insufficient stock — ${part.stock} ${part.unit} on hand, ${qty} requested.`,
    );
  }

  let issue;
  try {
    issue = await SparePartIssueModel.create({
      partCode,
      qty,
      unit: part.unit,
      machineId: typeof input.machineId === "string" ? input.machineId.trim() : "",
      issuedTo,
      workOrder: typeof input.workOrder === "string" ? input.workOrder.trim() : "",
      rateAtIssue: part.standardRate ?? 0,
      issuedAt,
      issuedBy,
      notes: typeof input.notes === "string" ? input.notes.trim() : "",
    });
  } catch (e) {
    // Compensate the decrement so a rejected ledger row never eats stock.
    await SparePartModel.updateOne({ code: partCode }, { $inc: { stock: qty } });
    throw friendlyError(e);
  }

  await syncLastIssued(updated, partCode);

  return {
    item: toDTO(updated.toObject() as unknown as SparePartDoc),
    issue: toIssueDTO(issue.toObject() as unknown as SparePartIssueDoc),
  };
}
