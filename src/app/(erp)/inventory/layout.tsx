import { ErpApp } from "@/components/erp-app";
import { ReactNode } from "react";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return <ErpApp>{children}</ErpApp>;
}
