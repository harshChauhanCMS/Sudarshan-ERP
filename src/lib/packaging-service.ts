import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { EntityStore } from "@/models/EntityStore";
import PackagingModel from "@/lib/models/Packaging";
import type { Packaging } from "@/lib/entity-types";

type PackagingDoc = {
  code: string;
  name: string;
  stock: number;
  unit: string;
  reorder: number;
  status: string;
  trend: number;
  capacity?: number;
  gradeCompatibility?: string;
  supplier?: string;
  materialType?: string;
  minStock?: number;
  notes?: string;
};

function toDTO(doc: PackagingDoc): Packaging {
  return {
    code: doc.code,
    name: doc.name,
    stock: doc.stock,
    unit: doc.unit,
    reorder: doc.reorder,
    status: doc.status,
    trend: doc.trend,
    capacity: doc.capacity,
    gradeCompatibility: doc.gradeCompatibility,
    supplier: doc.supplier,
    materialType: doc.materialType,
    minStock: doc.minStock,
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
    return new Error("Bag code already exists.");
  }
  return e instanceof Error ? e : new Error("Unexpected error.");
}

/** One-time best-effort migration from the old generic entity-store blob, if present. */
async function migrateLegacyIfEmpty() {
  const count = await PackagingModel.estimatedDocumentCount();
  if (count > 0) return;

  const legacy = await EntityStore.findOne({ key: "packaging" }).lean();
  const items = (legacy?.items as Record<string, unknown>[] | undefined) ?? [];
  if (!items.length) return;

  try {
    await PackagingModel.insertMany(items, { ordered: false });
  } catch {
    // Best-effort: legacy rows failing current validation are dropped.
  }
}

/** Generates the next `PK-NEW-###` code from the live collection (not a stale client list). */
async function generatePackagingCode(): Promise<string> {
  const docs = await PackagingModel.find(
    { code: /^PK-NEW-\d+$/ },
    { code: 1 },
  ).lean();
  let max = 0;
  for (const doc of docs) {
    const match = /^PK-NEW-(\d+)$/.exec(doc.code);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `PK-NEW-${String(max + 1).padStart(3, "0")}`;
}

export async function listPackaging(): Promise<Packaging[]> {
  await connectDB();
  await migrateLegacyIfEmpty();
  const docs = await PackagingModel.find({}).sort({ createdAt: -1 }).lean();
  return (docs as unknown as PackagingDoc[]).map(toDTO);
}

export async function getPackagingByCode(code: string): Promise<Packaging | null> {
  await connectDB();
  const doc = await PackagingModel.findOne({
    code: code.trim().toUpperCase(),
  }).lean();
  return doc ? toDTO(doc as unknown as PackagingDoc) : null;
}

export async function createPackaging(
  input: Record<string, unknown>,
): Promise<Packaging> {
  await connectDB();
  try {
    const code =
      typeof input.code === "string" && input.code.trim()
        ? input.code
        : await generatePackagingCode();
    const doc = await PackagingModel.create({ ...input, code });
    return toDTO(doc.toObject());
  } catch (e) {
    throw friendlyError(e);
  }
}

export async function updatePackagingByCode(
  code: string,
  patch: Record<string, unknown>,
): Promise<Packaging> {
  await connectDB();
  const doc = await PackagingModel.findOne({ code: code.trim().toUpperCase() });
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

export async function deletePackagingByCode(code: string): Promise<void> {
  await connectDB();
  const res = await PackagingModel.findOneAndDelete({
    code: code.trim().toUpperCase(),
  });
  if (!res) throw new Error(`Record not found: ${code}`);
}

/** Bulk replace — used by the generic entity-store bulk PATCH and by seeding. */
export async function replaceAllPackaging(items: unknown[]): Promise<void> {
  await connectDB();
  await PackagingModel.deleteMany({});
  if (Array.isArray(items) && items.length) {
    await PackagingModel.insertMany(items, { ordered: true });
  }
}
