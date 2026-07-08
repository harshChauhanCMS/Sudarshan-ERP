import { EntityStore } from "@/models/EntityStore";
import type { ErpData } from "@/lib/seed-data";
import { SEED_DATA } from "@/lib/seed-data";
import { EMPTY_ERP_DATA } from "@/lib/empty-erp-data";
import { connectDB } from "@/lib/mongodb";
import {
  listRawMaterials,
  createRawMaterial,
  updateRawMaterialByCode,
  deleteRawMaterialByCode,
  replaceAllRawMaterials,
} from "@/lib/raw-material-service";
import {
  listPackaging,
  createPackaging,
  updatePackagingByCode,
  deletePackagingByCode,
  replaceAllPackaging,
} from "@/lib/packaging-service";
import {
  listSpareParts,
  createSparePart,
  updateSparePartByCode,
  deleteSparePartByCode,
  replaceAllSpareParts,
} from "@/lib/spare-part-service";

const KEY_MAP: Record<Exclude<keyof ErpData, "USERS">, string> = {
  COMPANIES: "companies",
  RAW_MATERIALS: "rawMaterials",
  PACKAGING: "packaging",
  SPARE_PARTS: "spareParts",
  SPARE_CATEGORIES: "spareCategories",
  VENDORS: "vendors",
  PURCHASE_ORDERS: "purchaseOrders",
  CUSTOMERS: "customers",
  ORDERS: "orders",
  INVOICES: "invoices",
  DISPATCHES: "dispatches",
  EMPLOYEES: "employees",
  PERMISSIONS: "permissions",
  ROLES: "roles",
  NOTIFS: "notifications",
  REVENUE_DATA: "revenueData",
  PRODUCTION_DATA: "productionData",
  FIELD_VISITS: "fieldVisits",
  ATTENDANCE_TODAY: "attendanceToday",
};

const REVERSE_KEY_MAP: Record<string, keyof ErpData> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([field, key]) => [key, field as keyof ErpData])
) as Record<string, keyof ErpData>;

function docToField(
  doc: { key: string; items?: unknown[]; meta?: unknown }
): Partial<ErpData> {
  // Packaging has its own collection now — never resurrect it from a leftover generic-store doc.
  if (doc.key === "packaging") return {};
  const field = REVERSE_KEY_MAP[doc.key];
  if (!field) return {};
  if (field === "ATTENDANCE_TODAY") {
    return { ATTENDANCE_TODAY: (doc.meta ?? EMPTY_ERP_DATA.ATTENDANCE_TODAY) as ErpData["ATTENDANCE_TODAY"] };
  }
  return { [field]: (doc.items ?? []) } as Partial<ErpData>;
}

/** Load ERP entities from MongoDB only — never injects in-memory seed data. */
export async function loadErpDataFromDb(): Promise<ErpData> {
  await connectDB();
  const docs = await EntityStore.find({}).lean();

  const result: ErpData = { ...EMPTY_ERP_DATA };
  for (const doc of docs) {
    Object.assign(result, docToField(doc));
  }
  // Raw materials & spare parts live in their own validated collections, not the generic entity-store blob.
  result.RAW_MATERIALS = await listRawMaterials();
  result.SPARE_PARTS = await listSpareParts();
  // Packaging is intentionally NOT loaded here — it has its own dedicated API/hook
  // (usePackaging(), /api/inventory/packaging) and no longer rides along in bootstrap.
  // Server code that needs it calls listPackaging()/getPackagingByCode() directly.
  return result;
}

export async function seedEntities(): Promise<{ seeded: boolean; counts: Record<string, number> }> {
  await connectDB();
  await EntityStore.deleteMany({});

  const counts: Record<string, number> = {};
  for (const [field, key] of Object.entries(KEY_MAP)) {
    if (
      field === "USERS" ||
      field === "RAW_MATERIALS" ||
      field === "PACKAGING" ||
      field === "SPARE_PARTS"
    )
      continue;
    const value = SEED_DATA[field as keyof ErpData];
    if (key === "attendanceToday") {
      await EntityStore.create({ key, meta: value, items: [] });
      counts[key] = 1;
    } else if (Array.isArray(value)) {
      await EntityStore.create({ key, items: value });
      counts[key] = value.length;
    }
  }

  await replaceAllRawMaterials(SEED_DATA.RAW_MATERIALS);
  counts.rawMaterials = SEED_DATA.RAW_MATERIALS.length;

  await replaceAllPackaging(SEED_DATA.PACKAGING);
  counts.packaging = SEED_DATA.PACKAGING.length;

  await replaceAllSpareParts(SEED_DATA.SPARE_PARTS);
  counts.spareParts = SEED_DATA.SPARE_PARTS.length;

  return { seeded: true, counts };
}

export async function upsertEntity(
  key: string,
  items: unknown[] | Record<string, unknown>
) {
  if (key === "rawMaterials" && Array.isArray(items)) {
    await replaceAllRawMaterials(items);
    return;
  }
  if (key === "packaging" && Array.isArray(items)) {
    await replaceAllPackaging(items);
    return;
  }
  if (key === "spareParts" && Array.isArray(items)) {
    await replaceAllSpareParts(items);
    return;
  }
  await connectDB();
  if (key === "attendanceToday" && !Array.isArray(items)) {
    await EntityStore.findOneAndUpdate(
      { key },
      { meta: items, items: [] },
      { upsert: true, new: true }
    );
    return;
  }
  await EntityStore.findOneAndUpdate(
    { key },
    { items },
    { upsert: true, new: true }
  );
}

export async function getEntityItems<T = unknown>(key: string): Promise<T[]> {
  if (key === "rawMaterials") {
    return (await listRawMaterials()) as unknown as T[];
  }
  if (key === "packaging") {
    return (await listPackaging()) as unknown as T[];
  }
  if (key === "spareParts") {
    return (await listSpareParts()) as unknown as T[];
  }
  await connectDB();
  const doc = await EntityStore.findOne({ key }).lean();
  if (!doc) return [];
  return (doc.items as T[]) ?? [];
}

/** Entities keyed by `code` instead of `id`. */
const CODE_KEY_ENTITIES = new Set([
  "rawMaterials",
  "packaging",
  "spareParts",
]);

export function getEntityIdField(key: string): "id" | "code" | "module" {
  if (CODE_KEY_ENTITIES.has(key)) return "code";
  if (key === "permissions") return "module";
  return "id";
}

function matchItem(
  item: Record<string, unknown>,
  idField: string,
  id: string
): boolean {
  return String(item[idField] ?? "") === id;
}

export async function appendEntityItem(key: string, item: Record<string, unknown>) {
  if (key === "rawMaterials") {
    return createRawMaterial(item);
  }
  if (key === "packaging") {
    return createPackaging(item);
  }
  if (key === "spareParts") {
    return createSparePart(item);
  }
  if (key === "attendanceToday") {
    await upsertEntity(key, item);
    return item;
  }
  const items = (await getEntityItems<Record<string, unknown>>(key)) ?? [];
  const next = [...items, item];
  await upsertEntity(key, next);
  return item;
}

export async function updateEntityItem(
  key: string,
  id: string,
  patch: Record<string, unknown>,
  idField?: string
) {
  if (key === "rawMaterials") {
    return updateRawMaterialByCode(id, patch);
  }
  if (key === "packaging") {
    return updatePackagingByCode(id, patch);
  }
  if (key === "spareParts") {
    return updateSparePartByCode(id, patch);
  }
  const field = idField ?? getEntityIdField(key);
  if (key === "attendanceToday") {
    const doc = await EntityStore.findOne({ key }).lean();
    const meta = { ...(doc?.meta as Record<string, unknown>), ...patch };
    await upsertEntity(key, meta);
    return meta;
  }
  const items = await getEntityItems<Record<string, unknown>>(key);
  let found = false;
  const next = items.map((item) => {
    if (!matchItem(item, field, id)) return item;
    found = true;
    return { ...item, ...patch };
  });
  if (!found) throw new Error(`Record not found: ${id}`);
  await upsertEntity(key, next);
  return next.find((item) => matchItem(item, field, id));
}

export async function removeEntityItem(
  key: string,
  id: string,
  idField?: string
) {
  if (key === "rawMaterials") {
    await deleteRawMaterialByCode(id);
    return;
  }
  if (key === "packaging") {
    await deletePackagingByCode(id);
    return;
  }
  if (key === "spareParts") {
    await deleteSparePartByCode(id);
    return;
  }
  const field = idField ?? getEntityIdField(key);
  const items = await getEntityItems<Record<string, unknown>>(key);
  const next = items.filter((item) => !matchItem(item, field, id));
  if (next.length === items.length) throw new Error(`Record not found: ${id}`);
  await upsertEntity(key, next);
}

export { KEY_MAP };
