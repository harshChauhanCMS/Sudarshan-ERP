import { ErpApp } from "@/components/erp-app";
import type { ReactNode } from "react";

export default function ErpRootLayout({ children }: { children: ReactNode }) {
  return <ErpApp>{children}</ErpApp>;
}
