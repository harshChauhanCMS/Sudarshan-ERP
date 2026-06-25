import type { Customer, Order } from "@/lib/entity-types";
import {
  dispatchStatusCounts,
  dispatchesForPlant,
  formatLakhs,
  lowStockCount,
  overdueOpenOrders,
  revenueLakhsFromSeries,
} from "@/lib/erp-stats";
import { connectDB, isDbConfigured } from "@/lib/mongodb";
import AttendancePunch from "@/lib/models/AttendancePunch";
import Employee from "@/lib/models/Employee";
import FieldVisitAssignment from "@/lib/models/FieldVisitAssignment";
import { findSuppliedMaterial } from "@/lib/supplied-materials";
import type { ErpData } from "@/lib/seed-data";

export const OWNER_ENTITY_KINDS = [
  "dispatch",
  "order",
  "customer",
  "company",
  "supplied-material",
  "field-visit",
  "employee-field",
  "operational-risk",
  "vendor-alert",
] as const;

export type OwnerEntityKind = (typeof OWNER_ENTITY_KINDS)[number];

export function isOwnerEntityKind(value: string): value is OwnerEntityKind {
  return (OWNER_ENTITY_KINDS as readonly string[]).includes(value);
}

export type OwnerEntityDetailField = {
  label: string;
  value: string;
  tone?: "default" | "warn" | "danger" | "success" | "accent";
};

export type OwnerEntityDetailView = {
  kind: OwnerEntityKind;
  code: string;
  name: string;
  status: string;
  statusLabel: string;
  company?: "Minerals" | "Microns";
  stock?: {
    current: number;
    reorder: number;
    unit: string;
    levelPct: number;
  };
  fields: OwnerEntityDetailField[];
  footnote?: string;
};

function formatInr(n: number): string {
  if (n <= 0) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function statusLabel(status: string): string {
  return status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function orderStatusTone(status: string): OwnerEntityDetailField["tone"] {
  if (status === "delivered" || status === "dispatched") return "success";
  if (status === "in-production") return "accent";
  return "warn";
}

const VENDOR_PRICE_ALERTS = [
  {
    id: "vendor-tio2",
    name: "Titanium Dioxide — Pigments & Fillers",
    change: "+8.2%",
    up: true,
    vendor: "Pigments & Fillers Ltd",
    category: "Pigment",
  },
  {
    id: "vendor-hdpe",
    name: "HDPE Bags — Prime Pack Ltd",
    change: "+3.5%",
    up: true,
    vendor: "Prime Pack Ltd",
    category: "Packaging",
  },
  {
    id: "vendor-cc",
    name: "Calcium Carbonate — Minerals & Chem",
    change: "−2.1%",
    up: false,
    vendor: "Minerals & Chemicals",
    category: "Raw material",
  },
  {
    id: "vendor-kaolin",
    name: "Kaolin Clay — Minerals & Chemicals",
    change: "+5.0%",
    up: true,
    vendor: "Minerals & Chemicals",
    category: "Raw material",
  },
] as const;

function buildCompanyView(
  companyId: string,
  data: ErpData,
): OwnerEntityDetailView | null {
  const company = data.COMPANIES.find((c) => c.id === companyId);
  if (!company) return null;

  const rev = revenueLakhsFromSeries(data.REVENUE_DATA);
  const rmLow = lowStockCount(data.RAW_MATERIALS);
  const plantKey = companyId === "smic" ? "ahmedabad" : "udaipur";
  const dispatch = dispatchesForPlant(data.DISPATCHES, plantKey);
  const sales = companyId === "smic" ? rev.smic : rev.smi;

  return {
    kind: "company",
    code: company.id,
    name: company.name,
    status: "active",
    statusLabel: company.short,
    company: companyId === "smic" ? "Microns" : "Minerals",
    fields: [
      { label: "Company", value: company.name },
      { label: "Plant", value: company.plant },
      { label: "Sales (MTD)", value: formatLakhs(sales), tone: "accent" },
      { label: "Employees", value: String(company.employees) },
      { label: "Active orders", value: String(company.activeOrders) },
      { label: "Sites", value: String(company.sites) },
      {
        label: "RM alerts",
        value: String(rmLow),
        tone: rmLow > 0 ? "warn" : "default",
      },
      {
        label: "Dispatches today",
        value: String(dispatch.due),
        tone: "accent",
      },
      {
        label: "Products",
        value: company.products.slice(0, 4).join(", "),
      },
    ],
    footnote: company.desc,
  };
}

function buildVendorAlertView(id: string): OwnerEntityDetailView | null {
  const alert = VENDOR_PRICE_ALERTS.find((v) => v.id === id);
  if (!alert) return null;

  return {
    kind: "vendor-alert",
    code: alert.id,
    name: alert.name,
    status: alert.up ? "high" : "ok",
    statusLabel: alert.up ? "Price increase" : "Price decrease",
    company: "Minerals",
    fields: [
      { label: "Material / item", value: alert.name },
      { label: "Vendor", value: alert.vendor },
      { label: "Category", value: alert.category },
      {
        label: "Price change",
        value: alert.change,
        tone: alert.up ? "danger" : "success",
      },
      {
        label: "Margin impact",
        value: alert.up ? "Review running orders & quotes" : "Favourable for margins",
        tone: alert.up ? "warn" : "success",
      },
      {
        label: "Recommended action",
        value: alert.up
          ? "Renegotiate or pass through on paint segment orders"
          : "Consider stocking up if terms allow",
        tone: "accent",
      },
    ],
    footnote: "Vendor price movement alert · procurement review",
  };
}

function buildDispatchView(
  dispatch: ErpData["DISPATCHES"][number],
): OwnerEntityDetailView {
  const microns = dispatch.route.startsWith("Ahmedabad");
  return {
    kind: "dispatch",
    code: dispatch.id,
    name: dispatch.customer,
    status: dispatch.status,
    statusLabel: statusLabel(dispatch.status),
    company: microns ? "Microns" : "Minerals",
    stock: {
      current: dispatch.progress,
      reorder: 100,
      unit: "%",
      levelPct: dispatch.progress,
    },
    fields: [
      { label: "Dispatch ID", value: dispatch.id },
      { label: "Customer", value: dispatch.customer },
      { label: "Route", value: dispatch.route },
      { label: "Loaded qty", value: dispatch.loaded, tone: "accent" },
      { label: "ETA", value: dispatch.eta },
      { label: "Vehicle", value: dispatch.vehicle },
      { label: "Driver", value: dispatch.driver },
      {
        label: "Progress",
        value: `${dispatch.progress}%`,
        tone: dispatch.progress >= 90 ? "success" : "accent",
      },
      { label: "Last update", value: dispatch.lastUpdate },
    ],
    footnote: "Live dispatch tracking · driver check-in available on web ERP",
  };
}

function buildOrderView(order: Order): OwnerEntityDetailView {
  return {
    kind: "order",
    code: order.id,
    name: order.customer,
    status: order.status,
    statusLabel: statusLabel(order.status),
    company: "Minerals",
    fields: [
      { label: "Order ID", value: order.id },
      { label: "Customer", value: order.customer },
      { label: "Product", value: order.product },
      { label: "Quantity", value: order.qty, tone: "accent" },
      { label: "Order value", value: formatInr(order.value) },
      { label: "Due date", value: order.due, tone: "danger" },
      {
        label: "Progress",
        value: `${order.progress}%`,
        tone: order.progress >= 100 ? "success" : "warn",
      },
      {
        label: "Status",
        value: statusLabel(order.status),
        tone: orderStatusTone(order.status),
      },
    ],
    footnote: "Open sales order · overdue if past due date and not shipped",
  };
}

function buildCustomerView(customer: Customer): OwnerEntityDetailView {
  const mtd = Math.round((Number(customer.ytd) || 0) / 12);
  return {
    kind: "customer",
    code: customer.id,
    name: customer.name,
    status: "active",
    statusLabel: "Active customer",
    company: "Minerals",
    fields: [
      { label: "Customer ID", value: customer.id },
      { label: "Name", value: customer.name },
      { label: "City", value: customer.city },
      { label: "Payment terms", value: customer.terms },
      { label: "Open orders", value: String(customer.orders), tone: "accent" },
      { label: "YTD revenue", value: formatInr(Number(customer.ytd) || 0) },
      { label: "MTD (est.)", value: formatInr(mtd), tone: "success" },
      ...(customer.industryType
        ? [{ label: "Industry", value: customer.industryType }]
        : []),
      ...(customer.contact ? [{ label: "Contact", value: customer.contact }] : []),
      ...(customer.phone ? [{ label: "Phone", value: customer.phone }] : []),
    ],
    footnote: "Customer master · MTD estimated from YTD run-rate",
  };
}

function buildSuppliedMaterialView(
  id: string,
  data: ErpData,
): OwnerEntityDetailView | null {
  const catalog = findSuppliedMaterial(id);
  if (!catalog) return null;

  const rm = data.RAW_MATERIALS.find((r) => r.code === catalog.code);
  const stock = rm?.stock ?? 0;
  const reorder = rm?.reorder ?? 0;
  const unit = rm?.unit ?? "MT";

  return {
    kind: "supplied-material",
    code: catalog.id,
    name: catalog.name,
    status: rm?.status ?? "ok",
    statusLabel:
      rm?.status === "low"
        ? "Low stock"
        : rm?.status === "critical"
          ? "Critical"
          : "Supplying",
    company: "Minerals",
    stock: rm
      ? {
          current: stock,
          reorder,
          unit,
          levelPct:
            reorder > 0
              ? Math.min(100, Math.round((stock / (reorder * 3)) * 100))
              : 100,
        }
      : undefined,
    fields: [
      { label: "Material", value: catalog.name },
      { label: "Linked SKU", value: catalog.code },
      { label: "MTD volume supplied", value: catalog.volumeMtd, tone: "accent" },
      ...(rm
        ? [
            { label: "Grade", value: rm.grade },
            {
              label: "Stock on hand",
              value: `${rm.stock} ${rm.unit}`,
              tone: "warn" as const,
            },
            { label: "Location", value: rm.location },
            { label: "Inventory value", value: formatInr(rm.value) },
          ]
        : []),
    ],
    footnote: "Top supplied material · volume MTD across plants",
  };
}

async function buildFieldVisitView(id: string): Promise<OwnerEntityDetailView | null> {
  if (!isDbConfigured()) return null;
  await connectDB();

  const byMongo = await FieldVisitAssignment.findById(id).lean();
  const doc =
    byMongo ?? (await FieldVisitAssignment.findOne({ visitId: id }).lean());
  if (!doc) return null;

  const status = String(doc.status ?? "pending");
  const location =
    (doc.locationText as string | undefined)?.trim() ||
    (doc.visitLocation as { address?: string } | undefined)?.address ||
    "—";

  return {
    kind: "field-visit",
    code: String(doc.visitId ?? doc._id),
    name: String(doc.partyName ?? "Field visit"),
    status,
    statusLabel: statusLabel(status),
    company:
      String(doc.company ?? "").toLowerCase() === "smic" ? "Microns" : "Minerals",
    fields: [
      { label: "Visit ID", value: String(doc.visitId ?? doc._id) },
      { label: "Party", value: String(doc.partyName ?? "—") },
      { label: "Visit type", value: String(doc.visitType ?? "—") },
      { label: "Assigned to", value: String(doc.assignedEmployeeName ?? "—") },
      { label: "Location", value: location },
      {
        label: "Visit date",
        value: doc.visitDate
          ? new Date(String(doc.visitDate)).toLocaleDateString("en-IN")
          : "—",
      },
      {
        label: "Status",
        value: statusLabel(status),
        tone:
          status === "completed"
            ? "success"
            : status === "cancelled"
              ? "danger"
              : "accent",
      },
      ...(doc.notes ? [{ label: "Notes", value: String(doc.notes) }] : []),
    ],
    footnote: "Today's field sales assignment",
  };
}

async function buildEmployeeFieldView(
  id: string,
  data: ErpData,
): Promise<OwnerEntityDetailView | null> {
  if (isDbConfigured()) {
    await connectDB();
    const employee = await Employee.findOne({ employeeId: id })
      .select({
        employeeId: 1,
        fullName: 1,
        designation: 1,
        department: 1,
        locationUnit: 1,
        officialEmail: 1,
      })
      .lean();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const punch = employee
      ? await AttendancePunch.findOne({
          employeeId: id,
          punchedAt: { $gte: todayStart, $lte: todayEnd },
          punchType: "in",
        })
          .sort({ punchedAt: -1 })
          .lean()
      : null;

    if (employee) {
      const loc = punch?.location as { address?: string; city?: string } | undefined;
      const location = loc?.city || loc?.address || "Field location";
      return {
        kind: "employee-field",
        code: String(employee.employeeId),
        name: String(employee.fullName ?? id),
        status: "in-field",
        statusLabel: "In field today",
        company: String(employee.locationUnit ?? "").includes("Ahmedabad")
          ? "Microns"
          : "Minerals",
        fields: [
          { label: "Employee ID", value: String(employee.employeeId) },
          { label: "Name", value: String(employee.fullName ?? "—") },
          { label: "Designation", value: String(employee.designation ?? "—") },
          { label: "Department", value: String(employee.department ?? "—") },
          { label: "Current location", value: location, tone: "accent" },
          {
            label: "Punch-in",
            value: punch?.punchedAt
              ? new Date(String(punch.punchedAt)).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—",
          },
          ...(employee.officialEmail
            ? [{ label: "Email", value: String(employee.officialEmail) }]
            : []),
        ],
        footnote: "Employee punched in from field with GPS today",
      };
    }
  }

  const seedEmployee = data.EMPLOYEES.find((e) => e.id === id);
  if (!seedEmployee) return null;

  return {
    kind: "employee-field",
    code: seedEmployee.id,
    name: seedEmployee.name,
    status: "in-field",
    statusLabel: "In field today",
    company: "Minerals",
    fields: [
      { label: "Employee ID", value: seedEmployee.id },
      { label: "Name", value: seedEmployee.name },
      { label: "Role", value: seedEmployee.role },
      { label: "Department", value: seedEmployee.dept },
      { label: "Status", value: statusLabel(seedEmployee.status), tone: "success" },
      { label: "With company since", value: seedEmployee.since },
    ],
    footnote: "Field employee overview",
  };
}

function buildOperationalRiskView(
  riskId: string,
  data: ErpData,
): OwnerEntityDetailView | null {
  const rmLow = lowStockCount(data.RAW_MATERIALS);
  const overdueCount = overdueOpenOrders(data.ORDERS);
  const spareLow = lowStockCount(data.SPARE_PARTS);
  const lowRm = data.RAW_MATERIALS.filter(
    (r) => r.status === "low" || r.status === "critical",
  ).slice(0, 5);

  if (riskId === "rm") {
    return {
      kind: "operational-risk",
      code: riskId,
      name: "Raw material stock-out risk",
      status: "high",
      statusLabel: "High severity",
      company: "Minerals",
      fields: [
        { label: "Severity", value: "High", tone: "danger" },
        { label: "Items flagged", value: String(rmLow), tone: "warn" },
        {
          label: "Affected materials",
          value: lowRm.map((r) => r.name).join(", ") || "—",
        },
        {
          label: "Impact",
          value: "Paint-grade production may be impacted in 10–12 days if not reordered",
        },
        {
          label: "Recommended action",
          value: "Raise PO for critical RM this week",
          tone: "accent",
        },
      ],
      footnote: "Minerals plant raw material risk",
    };
  }

  if (riskId === "dispatch") {
    return {
      kind: "operational-risk",
      code: riskId,
      name: "Dispatch overdue risk",
      status: "high",
      statusLabel: "High severity",
      company: "Minerals",
      fields: [
        { label: "Severity", value: "High", tone: "danger" },
        { label: "Overdue orders", value: String(overdueCount), tone: "danger" },
        {
          label: "Impact",
          value: "Customer SLAs at risk · escalation required if not shipped by EOD",
        },
        {
          label: "Recommended action",
          value: "Review dispatch board and prioritize overdue",
          tone: "accent",
        },
      ],
      footnote: "Logistics and customer delivery risk",
    };
  }

  if (riskId === "vendor") {
    return {
      kind: "operational-risk",
      code: riskId,
      name: "Vendor price increases",
      status: "med",
      statusLabel: "Medium severity",
      company: "Minerals",
      fields: [
        { label: "Severity", value: "Medium", tone: "warn" },
        { label: "TiO₂ pigments", value: "+8.2%", tone: "danger" },
        { label: "Kaolin clay", value: "+5.0%", tone: "danger" },
        { label: "HDPE bags", value: "+3.5%", tone: "warn" },
        {
          label: "Recommended action",
          value: "Review margins on paint segment orders and quotes",
          tone: "accent",
        },
      ],
      footnote: "Procurement price movement · margin impact review",
    };
  }

  if (riskId === "spare") {
    return {
      kind: "operational-risk",
      code: riskId,
      name: "Spare parts lead time",
      status: "med",
      statusLabel: "Medium severity",
      company: "Minerals",
      fields: [
        { label: "Severity", value: "Medium", tone: "warn" },
        { label: "Low spare SKUs", value: String(spareLow), tone: "warn" },
        {
          label: "Impact",
          value: "Unplanned downtime risk if critical spares not ordered before maintenance",
        },
        {
          label: "Recommended action",
          value: "Order critical spares before planned shutdown",
          tone: "accent",
        },
      ],
      footnote: "Maintenance inventory risk",
    };
  }

  return null;
}

export function resolveDispatchListItemKey(
  key: string,
): { kind: OwnerEntityKind; id: string } | null {
  if (!key || key === "none" || key === "overdue") return null;
  if (/^DSP-/i.test(key)) return { kind: "dispatch", id: key };
  if (/^SO-/i.test(key)) return { kind: "order", id: key };
  return null;
}

export async function buildOwnerEntityDetailView(
  kind: OwnerEntityKind,
  id: string,
  data: ErpData,
): Promise<OwnerEntityDetailView | null> {
  const normalized = decodeURIComponent(id).trim();

  if (kind === "dispatch") {
    const dispatch = data.DISPATCHES.find((d) => d.id === normalized);
    return dispatch ? buildDispatchView(dispatch) : null;
  }

  if (kind === "order") {
    const order = data.ORDERS.find((o) => o.id === normalized);
    return order ? buildOrderView(order as Order) : null;
  }

  if (kind === "customer") {
    const customer = data.CUSTOMERS.find((c) => c.id === normalized);
    return customer ? buildCustomerView(customer as Customer) : null;
  }

  if (kind === "company") {
    return buildCompanyView(normalized, data);
  }

  if (kind === "supplied-material") {
    return buildSuppliedMaterialView(normalized, data);
  }

  if (kind === "field-visit") {
    return buildFieldVisitView(normalized);
  }

  if (kind === "employee-field") {
    return buildEmployeeFieldView(normalized, data);
  }

  if (kind === "operational-risk") {
    return buildOperationalRiskView(normalized, data);
  }

  if (kind === "vendor-alert") {
    return buildVendorAlertView(normalized);
  }

  return null;
}
