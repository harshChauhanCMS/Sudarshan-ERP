import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { EntityStore } from "@/models/EntityStore";
import RawMaterialModel from "@/lib/models/RawMaterial";
import type { RawMaterial } from "@/lib/entity-types";

type RawMaterialDoc = {
  code: string;
  name: string;
  grade: string;
  stock: number;
  unit: string;
  reorder: number;
  value: number;
  location: string;
  status: string;
  trend: number;
  category?: string;
  minStock?: number;
  preferredVendor?: string;
  notes?: string;
};

function toDTO(doc: RawMaterialDoc): RawMaterial {
  return {
    code: doc.code,
    name: doc.name,
    grade: doc.grade,
    stock: doc.stock,
    unit: doc.unit,
    reorder: doc.reorder,
    value: doc.value,
    location: doc.location,
    status: doc.status,
    trend: doc.trend,
    category: doc.category,
    minStock: doc.minStock,
    preferredVendor: doc.preferredVendor,
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
    return new Error("Material code already exists.");
  }
  return e instanceof Error ? e : new Error("Unexpected error.");
}

/** One-time best-effort migration from the old generic entity-store blob, if present. */
async function migrateLegacyIfEmpty() {
  const count = await RawMaterialModel.estimatedDocumentCount();
  if (count > 0) return;

  const legacy = await EntityStore.findOne({ key: "rawMaterials" }).lean();
  const items = (legacy?.items as Record<string, unknown>[] | undefined) ?? [];
  if (!items.length) return;

  try {
    await RawMaterialModel.insertMany(items, { ordered: false });
  } catch {
    // Best-effort: legacy rows missing newly-required fields (e.g. category) are dropped.
  }
}

export async function listRawMaterials(): Promise<RawMaterial[]> {
  await connectDB();
  await migrateLegacyIfEmpty();
  const docs = await RawMaterialModel.find({}).sort({ createdAt: -1 }).lean();
  return (docs as unknown as RawMaterialDoc[]).map(toDTO);
}

export async function getRawMaterialByCode(code: string): Promise<RawMaterial | null> {
  await connectDB();
  const doc = await RawMaterialModel.findOne({
    code: code.trim().toUpperCase(),
  }).lean();
  return doc ? toDTO(doc as unknown as RawMaterialDoc) : null;
}

export async function createRawMaterial(
  input: Record<string, unknown>,
): Promise<RawMaterial> {
  await connectDB();
  try {
    const doc = await RawMaterialModel.create(input);
    return toDTO(doc.toObject());
  } catch (e) {
    throw friendlyError(e);
  }
}

export async function updateRawMaterialByCode(
  code: string,
  patch: Record<string, unknown>,
): Promise<RawMaterial> {
  await connectDB();
  const doc = await RawMaterialModel.findOne({ code: code.trim().toUpperCase() });
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

export async function deleteRawMaterialByCode(code: string): Promise<void> {
  await connectDB();
  const res = await RawMaterialModel.findOneAndDelete({
    code: code.trim().toUpperCase(),
  });
  if (!res) throw new Error(`Record not found: ${code}`);
}

/** Bulk replace — used by the generic entity-store bulk PATCH and by seeding. */
export async function replaceAllRawMaterials(items: unknown[]): Promise<void> {
  await connectDB();
  await RawMaterialModel.deleteMany({});
  if (Array.isArray(items) && items.length) {
    await RawMaterialModel.insertMany(items, { ordered: true });
  }
}
