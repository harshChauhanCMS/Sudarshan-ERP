/** Entity shapes aligned with seed-data — used by forms and API payloads. */

export type Customer = {
  id: string;
  name: string;
  city: string;
  orders: number;
  ytd: number;
  terms: string;
  status?: string;
  gstin?: string;
  pan?: string;
  contact?: string;
  phone?: string;
  email?: string;
  creditLimit?: number;
  assignedTo?: string;
  appliesTo?: string;
  industryType?: string;
  billingAddress?: string;
  dispatchAddress?: string;
  preferredGrades?: string;
  paymentTerms?: string;
  notes?: string;
};

export type Order = {
  id: string;
  customer: string;
  product: string;
  qty: string;
  value: number;
  due: string;
  status: string;
  progress: number;
  orderDate?: string;
  materialCode?: string;
  grade?: string;
  quantity?: number;
  unit?: string;
  packaging?: string;
  bagSize?: number;
  bagsPerTon?: number;
  bagsRequired?: number;
  palletised?: boolean;
  bagsPerPallet?: number;
  dispatchDate?: string;
  priority?: string;
  assignedUnit?: string;
  specialInstructions?: string;
};

export type Invoice = {
  id: string;
  po: string;
  vendor: string;
  invDate: string;
  invAmt: number;
  poAmt: number;
  status: string;
  reason: string;
};

export type Vendor = {
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

export type PurchaseOrder = {
  id: string;
  vendor: string;
  items: number;
  total: number;
  date: string;
  status: string;
  invoice: string;
  materialCode?: string;
  materialName?: string;
  grade?: string;
  quantity?: number;
  unit?: string;
  rate?: number;
  expectedDelivery?: string;
  deliveryLocation?: string;
  notes?: string;
  poDate?: string;
};

export type RawMaterial = {
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

export type Packaging = {
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

export type SparePart = {
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

export type DispatchLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  city?: string;
  state?: string;
  updatedAt: string;
};

export type Dispatch = {
  id: string;
  vehicle: string;
  driver: string;
  customer: string;
  route: string;
  loaded: string;
  eta: string;
  progress: number;
  status: string;
  lastUpdate: string;
  orderId?: string;
  product?: string;
  sourceLocation?: string;
  deliveryLocation?: string;
  vehicleType?: string;
  waRef?: string;
  remarks?: string;
  planStatus?: string;
  plannedAt?: string;
  checkInToken?: string;
  qrGeneratedAt?: string;
  driverCheckedInAt?: string;
  driverUserId?: string;
  driverUserEmail?: string;
  driverEmployeeId?: string;
  lastLocation?: DispatchLocation;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: string;
  since: string;
  leaveBalance?: number;
};

export type FieldVisit = {
  id: string;
  rep: string;
  customer: string;
  city: string;
  status: string;
  ts: string;
  outcome: string;
};

export type PermissionRow = {
  module: string;
  owner: string;
  admin: string;
  rm: string;
  pack: string;
  spare: string;
  prod: string;
  disp: string;
  hr: string;
  sales: string;
};

export type EntityKey =
  | "companies"
  | "rawMaterials"
  | "packaging"
  | "spareParts"
  | "spareCategories"
  | "vendors"
  | "purchaseOrders"
  | "customers"
  | "orders"
  | "invoices"
  | "dispatches"
  | "employees"
  | "permissions"
  | "roles"
  | "notifications"
  | "revenueData"
  | "productionData"
  | "fieldVisits"
  | "attendanceToday";
