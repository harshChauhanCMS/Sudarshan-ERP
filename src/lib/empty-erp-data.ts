import type { ErpData } from "@/lib/seed-data";

const EMPTY_ATTENDANCE = {
  present: 0,
  total: 0,
  late: 0,
  leave: 0,
  absent: 0,
  onField: 0,
};

/** Dataset with no business entities — used when MongoDB is empty or unavailable (without mock flag). */
export const EMPTY_ERP_DATA: ErpData = {
  COMPANIES: [],
  RAW_MATERIALS: [],
  PACKAGING: [],
  SPARE_PARTS: [],
  SPARE_CATEGORIES: [],
  VENDORS: [],
  PURCHASE_ORDERS: [],
  CUSTOMERS: [],
  ORDERS: [],
  INVOICES: [],
  DISPATCHES: [],
  EMPLOYEES: [],
  NOTIFS: [],
  REVENUE_DATA: [],
  PRODUCTION_DATA: [],
  FIELD_VISITS: [],
  ATTENDANCE_TODAY: EMPTY_ATTENDANCE,
  USERS: [],
};

export function isErpDataEmpty(data: ErpData): boolean {
  return (
    data.COMPANIES.length === 0 &&
    data.ORDERS.length === 0 &&
    data.RAW_MATERIALS.length === 0 &&
    data.EMPLOYEES.length === 0
  );
}
