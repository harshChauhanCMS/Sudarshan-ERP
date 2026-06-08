import mongoose, { Schema, Document } from "mongoose";
import {
  MODULE_KEYS,
  type ModuleKey,
  type ModulePermission,
  type PermissionsMap,
} from "@/lib/permission-types";

export { MODULE_KEYS, type ModuleKey, type ModulePermission, type PermissionsMap };

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  hr: "HR & Attendance",
  payroll: "Payroll",
  inventory_raw: "Inventory: Raw Material",
  inventory_packaging: "Inventory: Packaging",
  inventory_spares: "Inventory: Spare Parts",
  procurement_vendors: "Procurement: Vendors",
  procurement_po: "Procurement: Purchase Orders",
  procurement_invoice: "Procurement: Invoice Verify",
  sales_customers: "Sales: Customers",
  sales_orders: "Sales: Orders",
  operations_production: "Operations: Production",
  operations_quality: "Operations: Quality",
  dispatch: "Dispatch",
  settings: "Settings",
  user_management: "User Management",
  reports: "Reports",
};

export type PermissionAction = "view" | "add" | "edit" | "approve" | "export";

// ─── Helper builders ──────────────────────────────────────────────────────────
const none = (): ModulePermission => ({ view: false, add: false, edit: false, approve: false, export: false });
const viewOnly = (): ModulePermission => ({ view: true, add: false, edit: false, approve: false, export: false });
const viewExport = (): ModulePermission => ({ view: true, add: false, edit: false, approve: false, export: true });
const viewAddEdit = (): ModulePermission => ({ view: true, add: true, edit: true, approve: false, export: false });
const viewAddEditExport = (): ModulePermission => ({ view: true, add: true, edit: true, approve: false, export: true });
const full = (): ModulePermission => ({ view: true, add: true, edit: true, approve: true, export: true });

// ─── Default Permissions per Role ────────────────────────────────────────────
const ownerPerms = (): PermissionsMap => ({
  dashboard: full(), hr: full(), payroll: full(),
  inventory_raw: full(), inventory_packaging: full(), inventory_spares: full(),
  procurement_vendors: full(), procurement_po: full(), procurement_invoice: full(),
  sales_customers: full(), sales_orders: full(),
  operations_production: full(), operations_quality: full(),
  dispatch: full(), settings: full(), user_management: full(), reports: full(),
});

const procurementPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: viewAddEditExport(), inventory_packaging: viewAddEditExport(), inventory_spares: viewAddEditExport(),
  procurement_vendors: viewAddEditExport(), procurement_po: full(), procurement_invoice: viewAddEditExport(),
  sales_customers: none(), sales_orders: none(),
  operations_production: none(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewExport(),
});

const rmProcurementPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: viewAddEditExport(), inventory_packaging: none(), inventory_spares: none(),
  procurement_vendors: viewAddEditExport(), procurement_po: viewAddEditExport(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: none(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewOnly(),
});

const packagingProcurementPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: none(), inventory_packaging: viewAddEditExport(), inventory_spares: none(),
  procurement_vendors: viewAddEditExport(), procurement_po: viewAddEditExport(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: none(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewOnly(),
});

const sparesProcurementPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: none(), inventory_packaging: none(), inventory_spares: viewAddEditExport(),
  procurement_vendors: viewAddEditExport(), procurement_po: viewAddEditExport(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: none(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewOnly(),
});

const productionPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: viewExport(), inventory_packaging: viewExport(), inventory_spares: viewOnly(),
  procurement_vendors: none(), procurement_po: none(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: full(), operations_quality: viewOnly(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewOnly(),
});

const dispatchPerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: viewOnly(), inventory_packaging: viewOnly(), inventory_spares: viewOnly(),
  procurement_vendors: none(), procurement_po: none(), procurement_invoice: none(),
  sales_customers: viewAddEditExport(), sales_orders: viewAddEditExport(),
  operations_production: viewOnly(), operations_quality: none(),
  dispatch: full(), settings: none(), user_management: none(), reports: viewOnly(),
});

const storePerms = (): PermissionsMap => ({
  dashboard: viewOnly(), hr: none(), payroll: none(),
  inventory_raw: viewAddEditExport(), inventory_packaging: viewAddEditExport(), inventory_spares: viewAddEditExport(),
  procurement_vendors: viewOnly(), procurement_po: viewOnly(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: viewOnly(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewOnly(),
});

const hrPerms = (): PermissionsMap => ({
  dashboard: viewExport(), hr: full(), payroll: full(),
  inventory_raw: none(), inventory_packaging: none(), inventory_spares: none(),
  procurement_vendors: none(), procurement_po: none(), procurement_invoice: none(),
  sales_customers: none(), sales_orders: none(),
  operations_production: none(), operations_quality: none(),
  dispatch: none(), settings: none(), user_management: none(), reports: viewExport(),
});

// ─── Default Roles Seed Data ──────────────────────────────────────────────────
export const DEFAULT_ROLES = [
  {
    roleKey: "owner",
    label: "Owner",
    description: "Full access to all modules. Intended for the business owner.",
    isSystem: true,
    permissions: ownerPerms(),
  },
  {
    roleKey: "admin",
    label: "Admin",
    description: "Full access. Same as Owner — includes user management, settings, and system configuration.",
    isSystem: true,
    permissions: ownerPerms(),
  },
  {
    roleKey: "procurement",
    label: "Procurement",
    description: "Vendors, Purchase Orders, Raw materials, Packaging, Spare parts. View, Add, Edit, Export. Full Approve on Purchase Orders.",
    isSystem: true,
    permissions: procurementPerms(),
  },
  {
    roleKey: "rm-procurement",
    label: "RM Procurement",
    description: "Raw material procurement only. View, Add, Edit, Export on Vendors and Purchase Orders (RM context). No access to Packaging or Spare parts.",
    isSystem: true,
    permissions: rmProcurementPerms(),
  },
  {
    roleKey: "packaging-procurement",
    label: "Packaging Procurement",
    description: "Packaging procurement only. View, Add, Edit, Export on Packaging, Vendors, Purchase Orders (packaging context). No access to Raw material or Spare parts.",
    isSystem: true,
    permissions: packagingProcurementPerms(),
  },
  {
    roleKey: "spare-parts-procurement",
    label: "Spare Parts Procurement",
    description: "Spare parts / machine parts only. View, Add, Edit, Export on Spare parts, Vendors, Purchase Orders (spares context). No access to Raw material or Packaging.",
    isSystem: true,
    permissions: sparesProcurementPerms(),
  },
  {
    roleKey: "production",
    label: "Production",
    description: "Full access on Production. View + Export on Raw materials & Packaging. View only on Spare parts.",
    isSystem: true,
    permissions: productionPerms(),
  },
  {
    roleKey: "dispatch",
    label: "Dispatch",
    description: "Full on Dispatch. View, Add, Edit, Export on Customers & Orders. View on others as needed.",
    isSystem: true,
    permissions: dispatchPerms(),
  },
  {
    roleKey: "store",
    label: "Store",
    description: "Raw materials, Packaging, Spare parts — View, Add, Edit, Export. No Approve. Handles receipt and stock adjustments.",
    isSystem: true,
    permissions: storePerms(),
  },
  {
    roleKey: "hr",
    label: "HR",
    description: "Full access on HR & Attendance. View + Export on Dashboard and Reports. No access to Settings.",
    isSystem: true,
    permissions: hrPerms(),
  },
];

// ─── Mongoose Schema ──────────────────────────────────────────────────────────
const ModulePermissionSchema = new Schema(
  {
    view: { type: Boolean, default: false },
    add: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    approve: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
  },
  { _id: false }
);

const PermissionsSchema = new Schema(
  Object.fromEntries(MODULE_KEYS.map((key) => [key, { type: ModulePermissionSchema, default: () => none() }])),
  { _id: false }
);

const RoleSchema = new Schema(
  {
    roleKey: {
      type: String,
      required: [true, "Role key is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: [true, "Role label is required"],
      trim: true,
    },
    description: { type: String, trim: true, default: "" },
    isSystem: { type: Boolean, default: false },
    permissions: { type: PermissionsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export interface RoleDocument extends Document {
  roleKey: string;
  label: string;
  description: string;
  isSystem: boolean;
  permissions: PermissionsMap;
}

export default mongoose.models.Role || mongoose.model<RoleDocument>("Role", RoleSchema);
