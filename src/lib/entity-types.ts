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

/** One entry in an invoice's audit trail — who moved it, when, and why. */
export type InvoiceEvent = {
  action: string;
  at: string;
  byEmail?: string;
  byName?: string;
  note?: string;
  from?: string;
  to?: string;
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
  /** Vendor's own invoice number, distinct from our internal `id`. */
  vendorInvoiceNo?: string;
  notes?: string;
  raisedAt?: string;
  raisedByEmail?: string;
  verifiedAt?: string;
  verifiedByEmail?: string;
  /** Verifier's mismatch note — what the vendor has to correct. */
  mismatchNote?: string;
  resubmittedAt?: string;
  /** Counts how many times the vendor has corrected and resent this invoice. */
  revision?: number;
  history?: InvoiceEvent[];

  // ── Manual verification (entered by hand against the paper invoice) ──────
  /** Taxable value before GST, as printed on the invoice. */
  subtotal?: number;
  /** GST / other tax charged on the invoice. */
  taxAmount?: number;
  /** Quantity actually received — what is added to stock on verification. */
  quantityReceived?: number;
  unit?: string;
  materialCode?: string;
  materialName?: string;
  /** Vendor name exactly as printed on the invoice, for the match check. */
  invoiceVendorName?: string;
  /** Rate as printed on the invoice, compared against the PO rate. */
  rate?: number;
  /** Date the goods were received, when it differs from the invoice date. */
  receivedDate?: string;
  /** Vendor's delivery-challan / GRN reference. */
  challanNo?: string;
  verifiedByName?: string;
  /** Free-text note the verifier left with the status they picked. */
  verificationNote?: string;
  /** The goods receipt raised when this invoice was verified. */
  grnNo?: string;
  grnAt?: string;
  /** Set once a verified invoice has been received into inventory. */
  inventoryUpdated?: boolean;
  inventoryUpdatedAt?: string;
  inventoryQty?: number;
  inventoryCode?: string;
  inventoryKind?: string;
  /** When the invoice was last sent back to the vendor for correction. */
  resentAt?: string;
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
  /** Address the PO PDF was emailed to on creation; blank when not sent. */
  vendorEmail?: string;
  /** ISO timestamp of that email, set only when it actually went out. */
  pdfEmailedAt?: string;
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
  createdByEmail?: string;
  createdByName?: string;
  createdByRole?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  /** Vendor-facing leg of the lifecycle — see `procurement-workflow.ts`. */
  sentToVendorAt?: string;
  sentToVendorBy?: string;
  vendorRespondedAt?: string;
  /** Vendor's reason when they decline, or their acknowledgement note. */
  vendorResponseNote?: string;
  /** Internal id of the most recent invoice raised against this PO. */
  invoiceId?: string;
  /** Cumulative quantity received across every GRN against this order. */
  receivedQty?: number;
  /** Ordered minus received — what the vendor still owes. */
  remainingQty?: number;
  /** Goods receipt numbers raised against this order, in order. */
  grnNos?: string[];
  /** When the last receipt against this order was recorded. */
  lastReceivedAt?: string;
  /** Set when a person closes the order — receiving never closes it. */
  closedAt?: string;
  closedBy?: string;
};

export type RawMaterial = {
  code: string;
  /** Last goods receipt, stamped when a vendor invoice is verified. */
  lastReceivedAt?: string;
  lastReceivedQty?: number;
  lastReceivedPo?: string;
  lastReceivedInvoiceNo?: string;
  lastReceivedGrn?: string;
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
  /** @deprecated Legacy seeder label — display fallback only. Use `lastIssuedAt`. */
  lastIssued: string;
  /** ISO timestamp of the newest issue, or null when never issued. */
  lastIssuedAt?: string | null;
  machineName?: string;
  standardRate?: number;
  criticality?: string;
  notes?: string;
};

export type SparePartIssue = {
  id: string;
  partCode: string;
  qty: number;
  unit: string;
  machineId: string;
  issuedTo: string;
  workOrder: string;
  rateAtIssue: number;
  /** ISO timestamp. */
  issuedAt: string;
  issuedBy: string;
  notes: string;
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
  | "notifications"
  | "revenueData"
  | "productionData"
  | "fieldVisits"
  | "attendanceToday";
