// @ts-nocheck
'use client';


import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DownloadOutlined, AlertOutlined, AppstoreOutlined, CarOutlined, CheckCircleOutlined, CheckOutlined, CloseOutlined, ClockCircleOutlined, DollarOutlined, FileExclamationOutlined, ShoppingCartOutlined, TeamOutlined, ThunderboltOutlined, WarningOutlined } from "@ant-design/icons";
import CommonTable from "@/components/common/CommonTable";
import { ERP_TABLE_PROPS, erpStatusBadge, inventoryStatusBadge } from "@/components/common/erpStatusBadges";
import { ErpViewAction, TableActionIcon, ViewEditActions } from "@/components/common/TableActionIcons";
import StatCard, { ErpStatGrid } from "@/components/common/StatCard";
import { Icon } from "./icons";
import { useDATA, useErpData } from "./data";
import { Btn, Badge, StatusBadge, Avatar, Bar, Sparkline, Kpi, Modal, fmtINR, fmtINRFull, fmtNum, AreaChart, BarChart, Donut } from "./ui";
import PageFilterPanel from "@/components/common/PageFilterPanel";
import { Select, message } from "antd";
import { EntityFormModal, FormField, FormGrid, FormInput, FormSelect, useFormState, requireFields } from "@/components/forms";
import { useEntityMutation } from "@/hooks/use-entity-mutation";
import { useSessionUser } from "@/hooks/use-session-user";
import { isAdminOrOwner } from "@/lib/role-utils";
import { nextDispatchId, formatDisplayDate } from "@/lib/id-generators";
import { buildInventoryItemDetailView } from "@/lib/inventory-mobile";
import { downloadCsv } from "@/lib/download-csv";
import { DashHead, SectionH } from "./dashboards";

function detailGrid(fields) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 38%) 1fr",
        gap: "10px 16px",
        fontSize: 13,
      }}
    >
      {fields.map((field) => (
        <React.Fragment key={field.label}>
          <span className="muted">{field.label}</span>
          <span>{field.value}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function vendorDetailFields(v) {
  return [
    { label: "Vendor ID", value: v.id },
    { label: "Name", value: v.name },
    { label: "City", value: v.city },
    { label: "Category", value: v.category },
    { label: "Rating", value: String(v.rating) },
    { label: "POs YTD", value: String(v.poCount) },
    { label: "YTD spend", value: fmtINR(v.ytd) },
    { label: "Contact", value: v.contactPerson || "—" },
    { label: "Phone", value: v.phone || "—" },
    { label: "Email", value: v.email || "—" },
    { label: "GSTIN", value: v.gstin || "—" },
    { label: "Address", value: v.address || "—" },
    { label: "Materials supplied", value: v.materialsSupplied || "—" },
    { label: "Payment terms", value: v.paymentTerms ? `${v.paymentTerms} days` : "—" },
    { label: "Lead time", value: v.leadTime != null ? `${v.leadTime} days` : "—" },
    { label: "Status", value: v.status || "active" },
  ];
}

function poDetailFields(po) {
  return [
    { label: "PO #", value: po.id },
    { label: "Vendor", value: po.vendor },
    { label: "Date", value: po.date },
    { label: "Items", value: String(po.items) },
    { label: "Total", value: fmtINRFull(po.total) },
    { label: "Status", value: po.status },
    { label: "Invoice", value: po.invoice },
    { label: "Material", value: po.materialName || "—" },
    { label: "Material code", value: po.materialCode || "—" },
    { label: "Grade", value: po.grade || "—" },
    {
      label: "Quantity",
      value: po.quantity != null ? `${po.quantity} ${po.unit ?? ""}`.trim() : "—",
    },
    { label: "Rate", value: po.rate != null ? fmtINRFull(po.rate) : "—" },
    { label: "Expected delivery", value: po.expectedDelivery || "—" },
    { label: "Delivery location", value: po.deliveryLocation || "—" },
    { label: "Notes", value: po.notes || "—" },
  ];
}

function downloadVendorCsv(v) {
  downloadCsv(
    `vendor-${v.id}.csv`,
    ["ID", "Name", "City", "Category", "Rating", "POs YTD", "YTD Spend", "Contact", "Phone", "Email", "GSTIN", "Address", "Materials", "Payment Terms", "Lead Time", "Status"],
    [{
      ID: v.id,
      Name: v.name,
      City: v.city,
      Category: v.category,
      Rating: v.rating,
      "POs YTD": v.poCount,
      "YTD Spend": v.ytd,
      Contact: v.contactPerson ?? "",
      Phone: v.phone ?? "",
      Email: v.email ?? "",
      GSTIN: v.gstin ?? "",
      Address: v.address ?? "",
      Materials: v.materialsSupplied ?? "",
      "Payment Terms": v.paymentTerms ?? "",
      "Lead Time": v.leadTime ?? "",
      Status: v.status ?? "active",
    }],
  );
}

function downloadPoCsv(po) {
  downloadCsv(
    `purchase-order-${po.id}.csv`,
    ["PO", "Vendor", "Date", "Items", "Total", "Status", "Invoice", "Material", "Code", "Grade", "Quantity", "Unit", "Rate", "Expected Delivery", "Location", "Notes"],
    [{
      PO: po.id,
      Vendor: po.vendor,
      Date: po.date,
      Items: po.items,
      Total: po.total,
      Status: po.status,
      Invoice: po.invoice,
      Material: po.materialName ?? "",
      Code: po.materialCode ?? "",
      Grade: po.grade ?? "",
      Quantity: po.quantity ?? "",
      Unit: po.unit ?? "",
      Rate: po.rate ?? "",
      "Expected Delivery": po.expectedDelivery ?? "",
      Location: po.deliveryLocation ?? "",
      Notes: po.notes ?? "",
    }],
  );
}

/* ============================================================
   MODULE SCREENS — Inventory, Procurement, Dispatch, Users, DS
   ============================================================ */


/* ============================================================
   RAW MATERIAL INVENTORY
   ============================================================ */
const RawMaterialInventory = () => {
  const router = useRouter();
  const DATA = useDATA();
  const { refresh } = useErpData();
  const [viewItem, setViewItem] = useState(null);
  const [deletingCode, setDeletingCode] = useState(null);

  const deleteMaterial = async (code) => {
    setDeletingCode(code);
    try {
      const res = await fetch(`/api/inventory/raw-materials/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      message.success("Raw material deleted.");
      await refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingCode(null);
    }
  };

  const viewDetail = useMemo(() => {
    if (!viewItem) return null;
    return buildInventoryItemDetailView("raw-material", viewItem.code, DATA);
  }, [viewItem, DATA]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredMaterials = useMemo(() => {
    return DATA.RAW_MATERIALS.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (search) {
        const term = search.toLowerCase();
        if (!r.code.toLowerCase().includes(term) && !r.name.toLowerCase().includes(term) && !r.grade.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [DATA.RAW_MATERIALS, search, categoryFilter, statusFilter]);

  const totalValue = DATA.RAW_MATERIALS.reduce((s, r) => s + r.value, 0);
  const lowCount = DATA.RAW_MATERIALS.filter(r => r.status === "low").length;
  const critCount = DATA.RAW_MATERIALS.filter(r => r.status === "critical").length;

  const columns = useMemo(
    () => [
      {
        title: "SKU",
        dataIndex: "code",
        key: "code",
        render: (code) => <span className="mono strong">{code}</span>,
      },
      {
        title: "Material",
        dataIndex: "name",
        key: "name",
        render: (name) => <span className="strong">{name}</span>,
      },
      { title: "Grade", dataIndex: "grade", key: "grade", render: (v) => <span className="muted">{v}</span> },
      { title: "Location", dataIndex: "location", key: "location", render: (v) => <span className="muted">{v}</span> },
      {
        title: "Stock",
        key: "stock",
        align: "right",
        render: (_, r) => (
          <>
            <span className="mono strong">{r.stock}</span>{" "}
            <span className="subtle" style={{ fontSize: 11 }}>{r.unit}</span>
          </>
        ),
      },
      {
        title: "Reorder at",
        key: "reorder",
        render: (_, r) => <span className="mono subtle">{r.reorder} {r.unit}</span>,
      },
      {
        title: "Stock level",
        key: "level",
        width: 120,
        render: (_, r) => {
          const pct = Math.min(100, (r.stock / (r.reorder * 3)) * 100);
          const tone = r.status === "critical" ? "danger" : r.status === "low" ? "warning" : "success";
          return <Bar value={pct} tone={tone} />;
        },
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        align: "right",
        render: (v) => <span className="mono">{fmtINR(v)}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => inventoryStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 120,
        align: "center",
        render: (_, r) => (
          <ViewEditActions
            onView={() => setViewItem(r)}
            editHref={`/inventory/raw-material/add?code=${encodeURIComponent(r.code)}`}
            showDelete
            onDelete={() => deleteMaterial(r.code)}
            deleteLabel={deletingCode === r.code ? "Deleting…" : "Delete"}
            deleteConfirmTitle={`Delete ${r.code}? This cannot be undone.`}
          />
        ),
      },
    ],
    [deletingCode, deleteMaterial]
  );

  return (
    <>
      <DashHead title="Raw Material Inventory" sub="Minerals and chemicals · live stock & alerts">
        <Btn icon="filter" size="sm">Filters</Btn>
        <Btn icon="download" size="sm">Export</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/inventory/raw-material/add")}>Add stock</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={AppstoreOutlined}
          label="Total SKUs"
          value={DATA.RAW_MATERIALS.length}
          hint="6 minerals · 4 chemicals"
        />
        <StatCard
          icon={DollarOutlined}
          label="Inventory value"
          value={fmtINR(totalValue)}
          hint="+4.8% vs last week"
          hintTone="positive"
        />
        <StatCard
          icon={WarningOutlined}
          label="Low stock"
          value={lowCount}
          hint="Reorder recommended"
          hintTone={lowCount > 0 ? "warning" : "default"}
        />
        <StatCard
          icon={AlertOutlined}
          label="Critical"
          value={critCount}
          hint="Affects 2 active orders"
          hintTone="negative"
        />
      </ErpStatGrid>

      <div className="card" style={{ marginBottom: 20 }}>
        <PageFilterPanel
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search SKU, name, grade…"
          activeFilterCount={(categoryFilter !== "all" ? 1 : 0) + (statusFilter !== "all" ? 1 : 0)}
          onApply={() => {}}
          onClear={() => {
            setSearch("");
            setCategoryFilter("all");
            setStatusFilter("all");
          }}
          drawerWidth={320}
        >
          <div className="arf-item">
            <span className="arf-label">Category</span>
            <Select
              className="w-full"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: "all", label: "All categories" },
                { value: "Mineral", label: "Minerals" },
                { value: "Chemical", label: "Chemicals" },
              ]}
            />
          </div>
          <div className="arf-item">
            <span className="arf-label">Status</span>
            <Select
              className="w-full"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "healthy", label: "Healthy" },
                { value: "low", label: "Low stock" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>
        </PageFilterPanel>
        <div style={{ padding: 16, paddingTop: 0 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={columns}
            dataSource={filteredMaterials}
            rowKey="code"
          />
        </div>
      </div>

      <Modal
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewDetail?.name ?? viewItem?.name ?? "Raw material"}
        sub={viewDetail ? `${viewDetail.code} · ${viewDetail.statusLabel}` : viewItem?.code}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setViewItem(null)}>
              Close
            </Btn>
            {viewItem ? (
              <Btn
                variant="primary"
                size="sm"
                icon="edit"
                onClick={() => {
                  router.push(
                    `/inventory/raw-material/add?code=${encodeURIComponent(viewItem.code)}`
                  );
                  setViewItem(null);
                }}
              >
                Edit
              </Btn>
            ) : null}
          </>
        }
      >
        {viewDetail ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(120px, 38%) 1fr",
              gap: "10px 16px",
              fontSize: 13,
            }}
          >
            {viewDetail.fields.map((field) => (
              <React.Fragment key={field.label}>
                <span className="muted">{field.label}</span>
                <span className={field.tone === "danger" ? "danger" : field.tone === "warn" ? "warning" : ""}>
                  {field.value}
                </span>
              </React.Fragment>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Material details unavailable.
          </p>
        )}
      </Modal>
    </>
  );
};

/* ============================================================
   VENDORS & PROCUREMENT (Vendors list + POs)
   ============================================================ */
const Vendors = ({ defaultTab = "vendors" }: { defaultTab?: "vendors" | "po" }) => {
  const router = useRouter();
  const DATA = useDATA();
  const { refresh } = useErpData();
  const { user } = useSessionUser();
  const canApprovePo = isAdminOrOwner(user?.role);
  const [tab, setTab] = useState(defaultTab);
  const [viewVendor, setViewVendor] = useState(null);
  const [viewPo, setViewPo] = useState(null);
  const [poActionId, setPoActionId] = useState(null);

  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorRatingFilter, setVendorRatingFilter] = useState("all");

  const [poSearch, setPoSearch] = useState("");
  const [poStatusFilter, setPoStatusFilter] = useState("all");

  const decidePo = useCallback(
    async (id, decision) => {
      setPoActionId(id);
      try {
        const res = await fetch(`/api/procurement/po/${encodeURIComponent(id)}/${decision}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const json = await res.json();
        if (!res.ok || json?.error) throw new Error(json?.error || "Action failed");
        message.success(decision === "approve" ? "Purchase order approved." : "Purchase order rejected.");
        await refresh();
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Action failed");
      } finally {
        setPoActionId(null);
      }
    },
    [refresh]
  );

  const filteredVendors = useMemo(() => {
    return DATA.VENDORS.filter(v => {
      if (vendorRatingFilter === "4.5" && parseFloat(v.rating) < 4.5) return false;
      if (vendorRatingFilter === "4.0" && parseFloat(v.rating) < 4.0) return false;
      if (vendorSearch) {
        const t = vendorSearch.toLowerCase();
        if (!v.name.toLowerCase().includes(t) && !v.id.toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [DATA.VENDORS, vendorSearch, vendorRatingFilter]);

  const filteredPos = useMemo(() => {
    return DATA.PURCHASE_ORDERS.filter(p => {
      if (poStatusFilter !== "all" && p.status !== poStatusFilter) return false;
      if (poSearch) {
        const t = poSearch.toLowerCase();
        if (!p.id.toLowerCase().includes(t) && !p.vendor.toLowerCase().includes(t)) return false;
      }
      return true;
    });
  }, [DATA.PURCHASE_ORDERS, poSearch, poStatusFilter]);

  const vendorColumns = useMemo(
    () => [
      {
        title: "ID",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Vendor",
        dataIndex: "name",
        key: "name",
        render: (name, row, index) => (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={name} color={(index % 5) + 1} />
            <div>
              <div className="strong">{name}</div>
              <div className="subtle" style={{ fontSize: 11 }}>
                {row.city}
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Category",
        dataIndex: "category",
        key: "category",
        render: (category) => (
          <Badge
            tone={
              category === "Raw Material"
                ? "primary"
                : category === "Chemical"
                  ? "info"
                  : category === "Packaging"
                    ? "gold"
                    : "default"
            }
          >
            {category}
          </Badge>
        ),
      },
      {
        title: "Rating",
        dataIndex: "rating",
        key: "rating",
        align: "center",
        render: (rating) =>
          rating > 0 ? (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--secondary)" }}>★</span>
              <span className="mono strong">{rating}</span>
            </div>
          ) : (
            <span className="subtle" style={{ fontSize: 12 }}>Not rated</span>
          ),
      },
      {
        title: "POs YTD",
        dataIndex: "poCount",
        key: "poCount",
        render: (poCount) => <span className="mono">{poCount}</span>,
      },
      {
        title: "YTD Spend",
        dataIndex: "ytd",
        key: "ytd",
        align: "right",
        render: (ytd) => <span className="num">{fmtINR(ytd)}</span>,
      },
      {
        title: "Actions",
        key: "actions",
        width: 88,
        align: "center",
        render: (_, row) => (
          <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <ErpViewAction label="View vendor" onClick={() => setViewVendor(row)} />
            <TableActionIcon
              icon={<DownloadOutlined />}
              label="Download vendor"
              onClick={() => downloadVendorCsv(row)}
            />
          </div>
        ),
      },
    ],
    []
  );

  const poColumns = useMemo(
    () => [
      {
        title: "PO #",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      { title: "Vendor", dataIndex: "vendor", key: "vendor" },
      {
        title: "Items",
        dataIndex: "items",
        key: "items",
        render: (items) => <span className="mono subtle">{items} items</span>,
      },
      {
        title: "Date",
        dataIndex: "date",
        key: "date",
        render: (date) => <span className="muted">{date}</span>,
      },
      {
        title: "Total",
        dataIndex: "total",
        key: "total",
        align: "right",
        render: (total) => <span className="num">{fmtINRFull(total)}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => erpStatusBadge(status),
      },
      {
        title: "Invoice",
        dataIndex: "invoice",
        key: "invoice",
        render: (invoice) => erpStatusBadge(invoice),
      },
      {
        title: "Actions",
        key: "actions",
        width: 132,
        align: "center",
        render: (_, row) => (
          <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <ErpViewAction label="View purchase order" onClick={() => setViewPo(row)} />
            <TableActionIcon
              icon={<DownloadOutlined />}
              label="Download purchase order"
              onClick={() => downloadPoCsv(row)}
            />
            {canApprovePo && row.status === "pending_verification" ? (
              <>
                <TableActionIcon
                  icon={<CheckOutlined />}
                  label="Approve purchase order"
                  onClick={() => decidePo(row.id, "approve")}
                  disabled={poActionId === row.id}
                />
                <TableActionIcon
                  icon={<CloseOutlined />}
                  label="Reject purchase order"
                  onClick={() => decidePo(row.id, "reject")}
                  disabled={poActionId === row.id}
                />
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [canApprovePo, decidePo, poActionId]
  );

  return (
    <>
      <DashHead title="Vendors & Procurement" sub="Manage vendors, purchase orders, and supplier history">
        <Btn icon="upload" size="sm">Import</Btn>
        <Btn icon="download" size="sm">Export</Btn>
        {tab === "vendors" ? (
          <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/procurement/vendors/add")}>Add vendor</Btn>
        ) : (
          <Btn variant="primary" size="sm" icon="plus" onClick={() => router.push("/procurement/po/add")}>Create PO</Btn>
        )}
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={TeamOutlined}
          label="Active vendors"
          value={DATA.VENDORS.length}
          hint="2 added this month"
        />
        <StatCard
          icon={ShoppingCartOutlined}
          label="Open POs"
          value={DATA.PURCHASE_ORDERS.filter((p) => p.status !== "received").length}
          hint={`${DATA.PURCHASE_ORDERS.filter((p) => p.status === "pending_verification").length} awaiting verification`}
          hintTone="accent"
        />
        <StatCard
          icon={DollarOutlined}
          label="PO spend · MTD"
          value={fmtINR(DATA.PURCHASE_ORDERS.reduce((s, p) => s + p.total, 0))}
          hint="From database"
          hintTone="positive"
        />
        <StatCard
          icon={FileExclamationOutlined}
          label="Invoice mismatches"
          value={DATA.INVOICES.filter((i) => i.status === "mismatch").length}
          hint="Needs verification"
          hintTone="negative"
        />
      </ErpStatGrid>

      <div className="card">
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
          <div className="tabs" style={{ border: "none", marginBottom: -1 }}>
            <span className={`tab ${tab === "vendors" ? "active" : ""}`} onClick={() => setTab("vendors")}>
              Vendors <span className="tab-count">{DATA.VENDORS.length}</span>
            </span>
            <span className={`tab ${tab === "po" ? "active" : ""}`} onClick={() => setTab("po")}>
              Purchase Orders <span className="tab-count">{DATA.PURCHASE_ORDERS.length}</span>
            </span>
          </div>
        </div>
        {tab === "vendors" ? (
          <>
            <PageFilterPanel
              search={vendorSearch}
              onSearchChange={setVendorSearch}
              searchPlaceholder="Search vendors by name or ID…"
              activeFilterCount={vendorRatingFilter !== "all" ? 1 : 0}
              onApply={() => {}}
              onClear={() => {
                setVendorSearch("");
                setVendorRatingFilter("all");
              }}
              drawerWidth={320}
            >
              <div className="arf-item">
                <span className="arf-label">Rating</span>
                <Select
                  className="w-full"
                  value={vendorRatingFilter}
                  onChange={setVendorRatingFilter}
                  options={[
                    { value: "all", label: "All ratings" },
                    { value: "4.5", label: "4.5 & up" },
                    { value: "4.0", label: "4.0 & up" },
                  ]}
                />
              </div>
            </PageFilterPanel>
            <div style={{ padding: 16, paddingTop: 0 }}>
              <CommonTable
                {...ERP_TABLE_PROPS}
                columns={vendorColumns}
                dataSource={filteredVendors}
                rowKey="id"
              />
            </div>
          </>
        ) : (
          <>
            <PageFilterPanel
              search={poSearch}
              onSearchChange={setPoSearch}
              searchPlaceholder="Search PO by ID or vendor…"
              activeFilterCount={poStatusFilter !== "all" ? 1 : 0}
              onApply={() => {}}
              onClear={() => {
                setPoSearch("");
                setPoStatusFilter("all");
              }}
              drawerWidth={320}
            >
              <div className="arf-item">
                <span className="arf-label">PO Status</span>
                <Select
                  className="w-full"
                  value={poStatusFilter}
                  onChange={setPoStatusFilter}
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "draft", label: "Draft" },
                    { value: "pending_verification", label: "Awaiting verification" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "received", label: "Received" },
                  ]}
                />
              </div>
            </PageFilterPanel>
            <div style={{ padding: 16, paddingTop: 0 }}>
              <CommonTable
                {...ERP_TABLE_PROPS}
                columns={poColumns}
                dataSource={filteredPos}
                rowKey="id"
              />
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!viewVendor}
        onClose={() => setViewVendor(null)}
        title={viewVendor?.name ?? "Vendor"}
        sub={viewVendor ? `${viewVendor.id} · ${viewVendor.category}` : ""}
        footer={
          <Btn variant="ghost" onClick={() => setViewVendor(null)}>
            Close
          </Btn>
        }
      >
        {viewVendor ? detailGrid(vendorDetailFields(viewVendor)) : null}
      </Modal>

      <Modal
        open={!!viewPo}
        onClose={() => setViewPo(null)}
        title={viewPo ? `Purchase order ${viewPo.id}` : "Purchase order"}
        sub={viewPo ? `${viewPo.vendor} · ${viewPo.date}` : ""}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setViewPo(null)}>
              Close
            </Btn>
            {viewPo ? (
              <Btn variant="primary" size="sm" icon="download" onClick={() => downloadPoCsv(viewPo)}>
                Download CSV
              </Btn>
            ) : null}
          </>
        }
      >
        {viewPo ? detailGrid(poDetailFields(viewPo)) : null}
      </Modal>
    </>
  );
};

/* ============================================================
   DISPATCH & TRACKING
   ============================================================ */
const DispatchTracking = () => {
  const DATA = useDATA();
  const { append, saving, error, clearError } = useEntityMutation();
  const [openTrack, setOpenTrack] = useState(null);
  const [planOpen, setPlanOpen] = useState(false);
  const dispatchForm = useFormState({
    orderId: DATA.ORDERS[0]?.id ?? "",
    dispatchId: nextDispatchId(DATA.DISPATCHES),
    vehicle: "RJ-27-GH-4521",
    driver: "Ramesh Kumar",
    route: "Udaipur → Mumbai",
    loaded: "24 MT",
    eta: formatDisplayDate(),
  });

  const scheduleDispatch = async () => {
    const order = DATA.ORDERS.find((o) => o.id === dispatchForm.values.orderId);
    await append("dispatches", {
      id: dispatchForm.values.dispatchId || nextDispatchId(DATA.DISPATCHES),
      vehicle: dispatchForm.values.vehicle,
      driver: dispatchForm.values.driver,
      customer: order?.customer ?? "—",
      route: dispatchForm.values.route,
      loaded: dispatchForm.values.loaded,
      eta: dispatchForm.values.eta,
      progress: 0,
      status: "loading",
      lastUpdate: "just now",
    });
    setPlanOpen(false);
  };

  const inTransit = DATA.DISPATCHES.filter((d) => d.status === "in-transit").length;

  const dispatchColumns = useMemo(
    () => [
      {
        title: "Dispatch",
        dataIndex: "id",
        key: "id",
        render: (id) => <span className="mono strong">{id}</span>,
      },
      {
        title: "Vehicle",
        dataIndex: "vehicle",
        key: "vehicle",
        render: (vehicle) => <span className="mono">{vehicle}</span>,
      },
      {
        title: "Driver",
        dataIndex: "driver",
        key: "driver",
        render: (driver, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={driver} color={(row.id.charCodeAt(row.id.length - 1) % 5) + 1} />
            <div>{driver}</div>
          </div>
        ),
      },
      {
        title: "Customer",
        dataIndex: "customer",
        key: "customer",
        render: (customer) => <span className="muted">{customer}</span>,
      },
      {
        title: "Route",
        dataIndex: "route",
        key: "route",
        render: (route) => <span className="muted" style={{ fontSize: 12 }}>{route}</span>,
      },
      {
        title: "Load",
        dataIndex: "loaded",
        key: "loaded",
        render: (loaded) => <span className="num">{loaded}</span>,
      },
      {
        title: "Progress",
        dataIndex: "progress",
        key: "progress",
        width: 130,
        render: (progress, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Bar value={progress} tone={row.status === "near-delivery" ? "gold" : row.status === "delivered" ? "success" : "primary"} />
            <span className="mono" style={{ fontSize: 11, width: 30, textAlign: "right" }}>
              {progress}%
            </span>
          </div>
        ),
      },
      {
        title: "ETA",
        dataIndex: "eta",
        key: "eta",
        render: (eta) => <span className="mono" style={{ fontSize: 12 }}>{eta}</span>,
      },
      {
        title: "Update",
        dataIndex: "lastUpdate",
        key: "lastUpdate",
        render: (lastUpdate) => <span className="subtle" style={{ fontSize: 11 }}>{lastUpdate}</span>,
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        render: (status) => erpStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: 72,
        align: "center",
        render: () => <ErpViewAction label="View dispatch" />,
      },
    ],
    []
  );

  return (
    <>
      <DashHead title="Dispatch & Vehicle Tracking" sub="Live deliveries, ETAs and driver communication">
        <Btn icon="map" size="sm">Map view</Btn>
        <Btn icon="bell" size="sm">Reminders</Btn>
        <Btn variant="primary" size="sm" icon="plus" onClick={() => { clearError(); setPlanOpen(true); }}>Plan dispatch</Btn>
      </DashHead>

      <ErpStatGrid cols={4}>
        <StatCard
          icon={CarOutlined}
          label="Active vehicles"
          value={DATA.DISPATCHES.length}
          hint={`${inTransit} in transit`}
          hintTone="accent"
        />
        <StatCard
          icon={ThunderboltOutlined}
          label="On-time rate"
          value="94.2%"
          hint="+1.2pp this month"
          hintTone="positive"
        />
        <StatCard
          icon={AlertOutlined}
          label="Delayed"
          value={2}
          hint="1 weather · 1 traffic"
          hintTone="negative"
        />
        <StatCard
          icon={ClockCircleOutlined}
          label="Avg transit"
          value="11.4 hrs"
          hint="−24 min vs Apr"
          hintTone="positive"
        />
      </ErpStatGrid>

      <div className="grid" style={{ gridTemplateColumns: "1fr 420px", marginBottom: 20 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="map" size={14} /> Live fleet map</div>
            <Badge tone="success" dot>Live</Badge>
          </div>
          <div className="card-body"><FleetMap /></div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><Icon name="bell" size={14} /> Reminders & alerts</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { sev: "danger",  t: "DSP-1040 delayed by 90 min",          d: "Heavy traffic near Allahabad · ETA shifted to May 24, 07:30" },
              { sev: "warning", t: "DSP-1037 still loading at Plant A",   d: "Scheduled to leave at 14:00 · 32 min overdue" },
              { sev: "info",    t: "Driver Manoj Singh idle for 2.5 hrs", d: "Last known: Nagpur fuel stop · sent ping" },
              { sev: "success", t: "DSP-1039 near customer",              d: "Nirma Bhavnagar — 4.2 km · 12 min ETA" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: 10, background: "var(--bg-sunken)", borderRadius: 8 }}>
                <span style={{ width: 3, borderRadius: 2, background: `var(--${a.sev})` }}></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.t}</div>
                  <div style={{ fontSize: 11, color: "var(--fg-muted)", marginTop: 2 }}>{a.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="truck" size={14} /> All dispatches</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search by ID, vehicle, driver…" style={{ width: 240, height: 30 }} />
            <Btn size="sm" icon="filter">Filter</Btn>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <CommonTable
            {...ERP_TABLE_PROPS}
            columns={dispatchColumns}
            dataSource={DATA.DISPATCHES}
            rowKey="id"
            onRow={(dispatch) => ({
              onClick: () => setOpenTrack(dispatch),
              style: { cursor: "pointer" },
            })}
          />
        </div>
      </div>

      <Modal
        open={!!openTrack}
        onClose={() => setOpenTrack(null)}
        title={openTrack ? `Track ${openTrack.id}` : ""}
        sub={openTrack ? `${openTrack.vehicle} · ${openTrack.driver}` : ""}
        wide
      >
        {openTrack && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
            <div>
              <div className="map-frame" style={{ height: 280, marginBottom: 16 }}>
                <FleetMap />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--fg-muted)" }}>JOURNEY TIMELINE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { t: "Loaded out", ts: "May 21, 06:42", loc: "Plant A · Udaipur", done: true },
                  { t: "Weighbridge cleared", ts: "May 21, 07:18", loc: "Udaipur Toll Plaza", done: true },
                  { t: "Last ping",  ts: openTrack.lastUpdate, loc: "Nagpur Bypass · 168 km in", done: true, active: true },
                  { t: "Customer ETA", ts: openTrack.eta, loc: openTrack.customer, done: false },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 12 }}>
                    <div style={{ position: "relative" }}>
                      <span className={`dot ${s.done ? (s.active ? "primary pulse" : "success") : ""}`} style={{ width: 12, height: 12, border: "2px solid var(--bg-elev)", boxShadow: "0 0 0 1px var(--border)" }}></span>
                      {i < 3 && <span style={{ position: "absolute", left: 5, top: 14, bottom: -10, width: 2, background: s.done ? "var(--success)" : "var(--border)" }}></span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: "var(--fg-subtle)" }}>{s.ts} · {s.loc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="card" style={{ marginBottom: 12 }}>
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", fontWeight: 600, marginBottom: 6 }}>Driver</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <Avatar name={openTrack.driver} color={1} size="lg" />
                    <div>
                      <div style={{ fontWeight: 600 }}>{openTrack.driver}</div>
                      <div className="subtle" style={{ fontSize: 11 }}>+91 98•••••328</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="default" size="sm" icon="phone" className="grow">Call</Btn>
                    <Btn variant="default" size="sm" icon="speech" className="grow">Message</Btn>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-body" style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-subtle)", fontWeight: 600, marginBottom: 10 }}>Trip details</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Customer</span><span className="strong">{openTrack.customer}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Route</span><span>{openTrack.route}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Loaded</span><span className="mono strong">{openTrack.loaded}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Vehicle</span><span className="mono">{openTrack.vehicle}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">ETA</span><span className="mono">{openTrack.eta}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}><span className="muted">Status</span><StatusBadge status={openTrack.status} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <EntityFormModal open={planOpen} onClose={() => setPlanOpen(false)} title="Plan new dispatch" sub="Assign vehicle, driver and route" wide submitLabel="Schedule dispatch" saving={saving} error={error} onSubmit={scheduleDispatch}>
        <FormGrid>
          <FormField label="Sales order">
            <FormSelect value={dispatchForm.values.orderId} onChange={(v) => dispatchForm.setField("orderId", v)}>
              {DATA.ORDERS.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.customer}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Dispatch #"><FormInput value={dispatchForm.values.dispatchId} onChange={(v) => dispatchForm.setField("dispatchId", v)} /></FormField>
          <FormField label="Vehicle"><FormInput value={dispatchForm.values.vehicle} onChange={(v) => dispatchForm.setField("vehicle", v)} /></FormField>
          <FormField label="Driver"><FormInput value={dispatchForm.values.driver} onChange={(v) => dispatchForm.setField("driver", v)} /></FormField>
          <FormField label="Route"><FormInput value={dispatchForm.values.route} onChange={(v) => dispatchForm.setField("route", v)} /></FormField>
          <FormField label="Load"><FormInput value={dispatchForm.values.loaded} onChange={(v) => dispatchForm.setField("loaded", v)} /></FormField>
        </FormGrid>
      </EntityFormModal>
    </>
  );
};

const FleetMap = () => {
  const cities = [
    { x: 52, y: 38, n: "Udaipur", t: "Plant A" },
    { x: 32, y: 56, n: "Ahmedabad", t: "Plant B" },
    { x: 28, y: 78, n: "Mumbai" },
    { x: 38, y: 90, n: "Pune" },
    { x: 80, y: 78, n: "Kolkata" },
    { x: 24, y: 64, n: "Bhavnagar" },
  ];
  const routes = [
    { from: [52, 38], to: [28, 78], color: "var(--primary)", progress: 0.68 },
    { from: [32, 56], to: [28, 78], color: "var(--info)", progress: 0.42 },
    { from: [52, 38], to: [80, 78], color: "var(--primary)", progress: 0.24 },
    { from: [32, 56], to: [24, 64], color: "var(--secondary)", progress: 0.92 },
  ];
  return (
    <div className="map-frame" style={{ height: 320, position: "relative" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <path d="M 20 20 Q 28 14 38 16 L 50 12 Q 62 10 72 18 L 84 22 Q 92 30 88 42 L 86 56 Q 82 72 70 82 L 56 92 Q 42 94 36 88 L 28 80 Q 20 70 18 56 L 18 38 Q 16 28 20 20 Z"
              fill="rgba(55,77,149,0.04)" stroke="rgba(55,77,149,0.15)" strokeWidth="0.4" strokeDasharray="0.6 0.6" />
        {routes.map((r, i) => (
          <g key={i}>
            <line x1={r.from[0]} y1={r.from[1]} x2={r.to[0]} y2={r.to[1]} stroke={r.color} strokeWidth="0.4" strokeDasharray="0.8 0.8" opacity="0.4" />
            <line x1={r.from[0]} y1={r.from[1]}
                  x2={r.from[0] + (r.to[0] - r.from[0]) * r.progress}
                  y2={r.from[1] + (r.to[1] - r.from[1]) * r.progress}
                  stroke={r.color} strokeWidth="0.6" strokeLinecap="round" />
          </g>
        ))}
      </svg>
      {cities.map((c, i) => (
        <div key={`d-${i}`} style={{
          position: "absolute",
          left: `${c.x}%`, top: `${c.y}%`,
          transform: "translate(-50%, -50%)",
          width: c.t ? 10 : 6, height: c.t ? 10 : 6,
          borderRadius: "50%",
          background: c.t ? "var(--primary)" : "#5a5e66",
          boxShadow: c.t ? "0 0 0 4px rgba(55,77,149,0.18)" : "0 0 0 3px rgba(90,94,102,0.18)",
          pointerEvents: "none",
        }}></div>
      ))}
      {routes.map((r, i) => (
        <div key={`m-${i}`} style={{
          position: "absolute",
          left: `${r.from[0] + (r.to[0] - r.from[0]) * r.progress}%`,
          top: `${r.from[1] + (r.to[1] - r.from[1]) * r.progress}%`,
          transform: "translate(-50%, -50%)",
          width: 12, height: 12, borderRadius: "50%",
          background: r.color,
          boxShadow: `0 0 0 5px ${r.color === "var(--secondary)" ? "rgba(232,169,1,0.22)" : "rgba(55,77,149,0.20)"}`,
          animation: "pulse 1.6s ease-in-out infinite",
          pointerEvents: "none",
        }}></div>
      ))}
      {cities.map((c, i) => (
        <div key={i} style={{
          position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
          transform: "translate(10px, -50%)", fontSize: 11,
          color: c.t ? "var(--primary)" : "var(--fg-muted)",
          fontWeight: c.t ? 600 : 500, whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {c.n}{c.t && <span style={{ marginLeft: 4, color: "var(--fg-subtle)", fontWeight: 400 }}>· {c.t}</span>}
        </div>
      ))}
    </div>
  );
};

export { RawMaterialInventory, Vendors, DispatchTracking };
