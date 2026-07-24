import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { EntityStore } from "@/models/EntityStore";
import SparePartModel from "@/lib/models/SparePart";
import type { SparePart } from "@/lib/entity-types";

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
