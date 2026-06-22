// @ts-nocheck
'use client';

"use client";

import { useEffect } from "react";
import { MasterDashboard, AdminDashboard, OwnerDashboard, ProductionDashboard, DispatchDashboard } from "./dashboards";
import { RawMaterialInventory, Vendors, DispatchTracking } from "./modules";
import { Customers, CustomerOrders, FieldVisitsBeatTracking, FieldVisitHistory, FieldBeatTerritory, InvoiceVerify } from "./modules2";
import { FieldActivityDashboardPage } from "@/components/field-sales/field-activity-dashboard-page";
import { FieldVisitLogPage } from "@/components/field-sales/field-visit-log-page";
import { Employees, Attendance, Payroll, Reports, PackagingInventory } from "./modules3";
import { SparePartsInventory } from "./modules4";
import { UserManagement, DesignSystem, Placeholder } from "./admin";

type Navigate = (path: string) => void;

function FieldSalesRedirect({ navigate }: { navigate: Navigate }) {
  useEffect(() => {
    navigate("/field-sales/activity-dashboard");
  }, [navigate]);
  return null;
}

export function renderErpRoute(route: string, navigate: Navigate) {
  switch (route) {
    case "/dashboard/master":
      return <MasterDashboard navigate={navigate} />;
    case "/dashboard/admin":
      return <AdminDashboard navigate={navigate} />;
    case "/dashboard/owner":
      return <OwnerDashboard />;
    case "/dashboard/production":
      return <ProductionDashboard navigate={navigate} />;
    case "/dashboard/dispatch":
      return <DispatchDashboard navigate={navigate} />;
    case "/inventory/raw-material":
      return <RawMaterialInventory />;
    case "/inventory/packaging":
      return <PackagingInventory />;
    case "/inventory/spare-parts":
      return <SparePartsInventory />;
    case "/procurement/vendors":
      return <Vendors />;
    case "/procurement/po":
      return <Vendors defaultTab="po" />;
    case "/procurement/invoices":
      return <InvoiceVerify />;
    case "/customers":
      return <Customers />;
    case "/orders":
      return <CustomerOrders />;
    case "/field-sales/activity-dashboard":
      return <FieldActivityDashboardPage />;
    case "/field-sales":
      return <FieldSalesRedirect navigate={navigate} />;
    case "/field-sales/visits-beat-tracking":
      return <FieldVisitsBeatTracking />;
    case "/field-sales/visit-log":
      return <FieldVisitLogPage />;
    case "/field-sales/visit-history":
      return <FieldVisitHistory />;
    case "/field-sales/beat-territory":
      return <FieldBeatTerritory />;
    case "/production":
      return <ProductionDashboard navigate={navigate} />;
    case "/dispatch":
      return <DispatchTracking />;
    case "/hr/employees":
      return <Employees />;
    case "/hr/attendance":
      return <Attendance />;
    case "/hr/payroll":
      return <Payroll />;
    case "/reports":
      return <Reports />;
    case "/users":
      return <UserManagement />;
    case "/design-system":
      return <DesignSystem />;
    default:
      return <MasterDashboard navigate={navigate} />;
  }
}
