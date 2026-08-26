import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { EntityStore } from "@/models/EntityStore";
import VendorModel from "@/lib/models/Vendor";
import { nextVendorId } from "@/lib/id-generators";
import type { Vendor } from "@/lib/entity-types";

type VendorDoc = {
  id: string;
  name: string;
  city: string;
  category: string;
  poCount: number;
  ytd: number;
  rating: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  materialsSupplied?: string;
  paymentTerms?: string;
  leadTime?: number;
  status?: string;
};

function toDTO(doc: VendorDoc): Vendor {
  return {
    id: doc.id,
    name: doc.name,
    city: doc.city,
    category: doc.category,
    poCount: doc.poCount,
    ytd: doc.ytd,
    rating: doc.rating,
    contactPerson: doc.contactPerson,
    phone: doc.phone,
    email: doc.email,
    gstin: doc.gstin,
    address: doc.address,
    materialsSupplied: doc.materialsSupplied,
    paymentTerms: doc.paymentTerms,
    leadTime: doc.leadTime,
    status: doc.status,
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
    return new Error("Vendor code already exists.");
  }
  return e instanceof Error ? e : new Error("Unexpected error.");
}

/** One-time best-effort migration from the old generic entity-store blob, if present. */
async function migrateLegacyIfEmpty() {
  const count = await VendorModel.estimatedDocumentCount();
  if (count > 0) return;

  const legacy = await EntityStore.findOne({ key: "vendors" }).lean();
  const items = (legacy?.items as Record<string, unknown>[] | undefined) ?? [];
  if (!items.length) return;

  try {
    await VendorModel.insertMany(items, { ordered: false });
  } catch {
    // Best-effort: legacy rows missing newly-required fields are dropped.
  }
}

/** Allocate the next unused vendor code (retries on collision). */
async function allocateVendorId(): Promise<string> {
  const rows = await VendorModel.find({}, { id: 1 }).lean();
  let candidate = nextVendorId(rows as { id?: string }[]);

  for (let attempt = 0; attempt < 8; attempt++) {
    const exists = await VendorModel.exists({ id: candidate });
    if (!exists) return candidate;
    const m = candidate.match(/^V-(\d+)$/i);
    const n = m ? parseInt(m[1], 10) : rows.length + 1;
    candidate = `V-${String(n + 1).padStart(3, "0")}`;
  }

  throw new Error("Could not allocate a unique vendor code");
}

export async function listVendors(): Promise<Vendor[]> {
  await connectDB();
  await migrateLegacyIfEmpty();
  const docs = await VendorModel.find({}).sort({ createdAt: -1 }).lean();
  return (docs as unknown as VendorDoc[]).map(toDTO);
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  await connectDB();
  const doc = await VendorModel.findOne({ id: id.trim().toUpperCase() }).lean();
  return doc ? toDTO(doc as unknown as VendorDoc) : null;
}

export async function createVendor(
  input: Record<string, unknown>,
): Promise<Vendor> {
  await connectDB();
  try {
    const payload = { ...input };
    const rawId = typeof payload.id === "string" ? payload.id.trim() : "";
    payload.id = rawId || (await allocateVendorId());

    const doc = await VendorModel.create(payload);
    return toDTO(doc.toObject());
  } catch (e) {
    throw friendlyError(e);
  }
}

export async function updateVendorById(
  id: string,
  patch: Record<string, unknown>,
): Promise<Vendor> {
  await connectDB();
  const doc = await VendorModel.findOne({ id: id.trim().toUpperCase() });
  if (!doc) throw new Error(`Record not found: ${id}`);

  const rest = { ...patch };
  delete rest.id;
  Object.assign(doc, rest);

  try {
    await doc.save();
  } catch (e) {
    throw friendlyError(e);
  }
  return toDTO(doc.toObject());
}

export async function deleteVendorById(id: string): Promise<void> {
  await connectDB();
  const res = await VendorModel.findOneAndDelete({ id: id.trim().toUpperCase() });
  if (!res) throw new Error(`Record not found: ${id}`);
}

/** Bulk replace — used by the generic entity-store bulk PATCH and by seeding. */
export async function replaceAllVendors(items: unknown[]): Promise<void> {
  await connectDB();
  await VendorModel.deleteMany({});
  if (Array.isArray(items) && items.length) {
    await VendorModel.insertMany(items, { ordered: true });
  }
}
