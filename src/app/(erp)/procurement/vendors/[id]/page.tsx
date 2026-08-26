"use client";

import { useParams, useRouter } from "next/navigation";
import { Btn } from "@/components/erp/ui";
import { VendorForm, type VendorFormValues } from "@/components/procurement/VendorForm";
import { useVendorRecord, type VendorRecord } from "@/hooks/use-vendor-record";

function toFormValues(vendor: VendorRecord): VendorFormValues {
  return {
    vendorName: vendor.name,
    vendorCode: vendor.id,
    contactPerson: vendor.contactPerson ?? "",
    phone: vendor.phone ?? "",
    email: vendor.email ?? "",
    gst: vendor.gstin ?? "",
    address: vendor.address ?? "",
    materialsSupplied: vendor.materialsSupplied ?? "",
    paymentTerms: vendor.paymentTerms ?? "30",
    leadTime: String(vendor.leadTime ?? 7),
    status: vendor.status ?? "active",
  };
}

export default function ViewVendorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { vendor, loading, error } = useVendorRecord(params.id);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        Loading vendor…
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--fg-muted)" }}>
        <p>{error || "Vendor not found."}</p>
        <Btn variant="primary" onClick={() => router.push("/procurement/vendors")}>
          Back to vendor list
        </Btn>
      </div>
    );
  }

  return (
    <VendorForm
      mode="view"
      vendorId={vendor.id}
      initialValues={toFormValues(vendor)}
      snapshot={{ rating: vendor.rating, poCount: vendor.poCount, ytd: vendor.ytd }}
    />
  );
}
