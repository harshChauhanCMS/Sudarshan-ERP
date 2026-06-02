// @ts-nocheck
'use client';


import React, { useState, useEffect, useRef } from "react";
import { Icon } from "./icons";

/* ============================================================
   SIDEBAR + TOPBAR
   ============================================================ */


const NAV = [
  {
    id: "dashboards",
    label: "Dashboards",
    items: [
      { id: "/dashboard/master",     label: "Master",      icon: "master" },
      { id: "/dashboard/admin",      label: "Admin",       icon: "shield" },
      { id: "/dashboard/owner",      label: "Owner",       icon: "crown" },
      { id: "/dashboard/production", label: "Production",  icon: "factory" },
      { id: "/dashboard/dispatch",   label: "Dispatch",    icon: "truck" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    items: [
      { id: "/inventory/raw-material", label: "Raw Material", icon: "box" },
      { id: "/inventory/packaging",    label: "Packaging",    icon: "package" },
      { id: "/inventory/spare-parts",  label: "Spare Parts",  icon: "wrench" },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    items: [
      { id: "/procurement/vendors",   label: "Vendors",          icon: "users" },
      { id: "/procurement/po",        label: "Purchase Orders",  icon: "cart" },
      { id: "/procurement/invoices",  label: "Invoice Verify",   icon: "invoice" },
    ],
  },
  {
    id: "sales",
    label: "Sales & Orders",
    items: [
      { id: "/customers",             label: "Customers",        icon: "users" },
      { id: "/orders",                label: "Customer Orders",  icon: "ticket" },
      { id: "/field-sales",           label: "Field Sales",      icon: "pin" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { id: "/production",            label: "Production",       icon: "factory" },
      { id: "/dispatch",              label: "Dispatch & Track", icon: "truck" },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "/hrms/employees",   label: "Employees",   icon: "user" },
      {
        id: "people/hr-management",
        label: "HR Management",
        icon: "user",
        items: [
          { id: "/hrms/attendance", label: "Attendance", icon: "clock" },
          { id: "/hrms/salary",     label: "Salary",     icon: "money" },
        ],
      },
      {
        id: "people/hr-reports",
        label: "Reports",
        icon: "chart",
        items: [
          { id: "/hrms/reports/attendance", label: "Attendance Overview", icon: "chart" },
          { id: "/hrms/reports/employee",   label: "Employee Report",     icon: "user" },
          { id: "/hrms/reports/daily",       label: "Daily Attendance",    icon: "calendar" },
          { id: "/hrms/reports/field",       label: "Field Attendance",    icon: "pin" },
          { id: "/hrms/reports/late-early",  label: "Late Coming / Early Going", icon: "clock" },
          { id: "/hrms/payroll",             label: "Payroll",                 icon: "money" },
        ],
      },
      {
        id: "people/leave-policy",
        label: "Leave & Policy",
        icon: "calendar",
        items: [
          { id: "/hrms/leave/record",   label: "Leave record",   icon: "chart" },
          { id: "/hrms/leave/apply",    label: "Apply leave",    icon: "plus" },
          { id: "/hrms/leave/approval", label: "Leave approval", icon: "check" },
          { id: "/hrms/leave/admin",    label: "Leave admin",    icon: "layout" },
        ],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "/reports",        label: "Reports",          icon: "chart" },
      { id: "/users",          label: "User Management",  icon: "shield" },
      { id: "/design-system",  label: "Design System",    icon: "layout" },
    ],
  },
];

/** Collect nested nav group ids (items with sub-items). */
const collectNavGroupIds = (items) => {
  const ids = [];
  for (const item of items) {
    if (Array.isArray(item?.items)) {
      ids.push(item.id);
      ids.push(...collectNavGroupIds(item.items));
    }
  }
  return ids;
};

const ALL_SECTION_IDS = NAV.map((section) => section.id);
const ALL_GROUP_IDS = NAV.flatMap((section) => collectNavGroupIds(section.items));

const Sidebar = ({
  route,
  navigate,
  company,
  onCompanyClick,
  badgeMap = {},
  sidebarWidth,
  setSidebarWidth,
  isCollapsed,
  setIsCollapsed,
  mobileOpen = false,
  onMobileClose,
}) => {
  const [collapsed, setCollapsed] = useState({});
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const toggleGroup = (id) => setCollapsedGroups((c) => ({ ...c, [id]: !c[id] }));
  const collapseAll = () => {
    setCollapsed(Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, true])));
    setCollapsedGroups(Object.fromEntries(ALL_GROUP_IDS.map((id) => [id, true])));
  };

  const isResizing = useRef(false);

  useEffect(() => {
    if (
      route === "/hrms/reports" ||
      route?.startsWith("/hrms/reports/") ||
      route === "/hrms/payroll" ||
      route?.startsWith("/hrms/payroll/")
    ) {
      setCollapsedGroups((c) => ({ ...c, "people/hr-reports": false }));
    }
  }, [route]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 400) newWidth = 400;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setSidebarWidth]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const goTo = (path) => {
    navigate(path);
    onMobileClose?.();
  };

  const navItemIsActive = (item) => {
    if (!item) return false;
    if (Array.isArray(item.items)) {
      if (
        item.id === "people/hr-reports" &&
        (route === "/hrms/reports" || route?.startsWith("/hrms/reports/"))
      ) {
        return true;
      }
      return item.items.some((child) => navItemIsActive(child));
    }
    return route === item.id || (route && route.startsWith(`${item.id}/`));
  };

  const renderNavItem = (item, depth = 0) => {
    const isGroup = item && typeof item === "object" && Array.isArray(item.items);
    if (isGroup) {
      const groupActive = navItemIsActive(item);
      const isGroupCollapsed = !!collapsedGroups[item.id];
      return (
        <div
          key={item.id}
          className={`sb-item-group ${groupActive ? "active" : ""} ${depth > 0 ? "sb-item-group--nested" : ""}`}
        >
          <div
            className={`sb-item ${depth > 0 ? "sub" : ""} ${groupActive ? "active" : ""}`}
            onClick={() => toggleGroup(item.id)}
          >
            <span className="sb-item-icon">
              <Icon name={item.icon || "user"} size={15} />
            </span>
            <span className="sb-item-label">{item.label}</span>
            <span className="sb-item-right">
              <Icon name="chevDown" size={11} className={`chev ${isGroupCollapsed ? "" : "open"}`} />
            </span>
          </div>
          {!isGroupCollapsed && (
            <div className="sb-subitems">
              {item.items.map((child) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isActive = navItemIsActive(item);
    const badges = badgeMap[item.id];
    return (
      <div
        key={item.id}
        className={`sb-item ${depth > 0 ? "sub" : ""} ${isActive ? "active" : ""}`}
        onClick={() => goTo(item.id)}
      >
        <span className="sb-item-icon">
          <Icon name={item.icon} size={15} />
        </span>
        <span className="sb-item-label">{item.label}</span>
        {badges?.badge && <span className="sb-item-badge">{badges.badge}</span>}
        {badges?.badgeAlert && (
          <span className="sb-item-badge alert">{badges.badgeAlert}</span>
        )}
      </div>
    );
  };

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      {/* Resizer Handle */}
      {!isCollapsed && (
        <div 
          className="sidebar-resizer" 
          onMouseDown={handleMouseDown} 
          title="Drag to resize"
        />
      )}
      <div className="sb-brand" onClick={onCompanyClick} title="Switch company">
        <div className={`sb-brand-mark ${company.mark === "gold" ? "sec" : ""}`}>
          {company.mark === "gold" ? "M" : "S"}
        </div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">{company.name}</div>
          <div className="sb-brand-sub">
            <span className="dot success" style={{ width: 5, height: 5 }}></span>
            {company.plant}
          </div>
        </div>
        <div className="sb-brand-switch">
          <Icon name="switch" size={14} />
        </div>
      </div>
      {/* Collapse Toggle — desktop only */}
      <button 
        className="sb-collapse-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)} 
        title="Toggle Sidebar"
        style={{ 
          position: "absolute",
          right: -12,
          top: 24,
          zIndex: 110,
          background: "var(--bg-elev)", 
          border: "1px solid var(--border)", 
          borderRadius: "50%", 
          width: 24, 
          height: 24, 
          display: "grid", 
          placeItems: "center",
          cursor: "pointer",
          color: "var(--fg)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}
      >
        <Icon name={isCollapsed ? "chevRight" : "chevLeft"} size={14} />
      </button>

      <button
        type="button"
        className="sb-mobile-close"
        onClick={onMobileClose}
        title="Close menu"
        aria-label="Close menu"
      >
        <Icon name="x" size={16} />
      </button>

      <div className="sb-search">
        <div className="sb-search-box">
          <Icon name="search" size={13} />
          <span>Search…</span>
          <div className="kbd-group" style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            <span className="kbd">⌘</span>
            <span className="kbd">K</span>
          </div>
        </div>
      </div>

      <div className="sb-nav-toolbar">
        <button
          type="button"
          className="sb-collapse-all-btn"
          onClick={collapseAll}
          title="Collapse all sections"
          aria-label="Collapse all sections"
        >
          <Icon name="chevUp" size={13} />
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map((section) => (
          <div key={section.id} className={`sb-section ${collapsed[section.id] ? "collapsed" : ""}`}>
            <div className="sb-section-label" onClick={() => toggle(section.id)}>
              <span>{section.label}</span>
              <Icon name="chevDown" size={11} className="chev" />
            </div>
            <div className="sb-section-items">
              {section.items.map((item) => renderNavItem(item))}
            </div>
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-foot-avatar">RM</div>
        <div className="sb-foot-info">
          <div className="sb-foot-name">Rajiv Mehta</div>
          <div className="sb-foot-role">Owner · Both companies</div>
        </div>
        <button className="sb-foot-btn" title="Settings">
          <Icon name="settings" size={14} />
        </button>
      </div>
    </aside>
  );
};

/* ============================================================
   TOPBAR
   ============================================================ */
const breadcrumbsFor = (route) => {
  const map = {
    "/dashboard/master":     ["Dashboards", "Master"],
    "/dashboard/admin":      ["Dashboards", "Admin"],
    "/dashboard/owner":      ["Dashboards", "Owner"],
    "/dashboard/production": ["Dashboards", "Production"],
    "/dashboard/dispatch":   ["Dashboards", "Dispatch"],
    "/inventory/raw-material":["Inventory", "Raw Material"],
    "/inventory/packaging":  ["Inventory", "Packaging"],
    "/inventory/spare-parts":["Inventory", "Spare Parts"],
    "/procurement/vendors":  ["Procurement", "Vendors"],
    "/procurement/po":       ["Procurement", "Purchase Orders"],
    "/procurement/invoices": ["Procurement", "Invoice Verification"],
    "/customers":            ["Sales", "Customers"],
    "/orders":               ["Sales", "Orders"],
    "/field-sales":          ["Sales", "Field Sales"],
    "/production":           ["Operations", "Production"],
    "/dispatch":             ["Operations", "Dispatch & Tracking"],
    "/hrms/employees":         ["People", "Employees"],
    "/hrms/attendance":        ["People", "HR Management", "Attendance"],
    "/hrms/reports":              ["People", "Reports"],
    "/hrms/reports/attendance":   ["People", "Reports", "Attendance Overview"],
    "/hrms/reports/employee":     ["People", "Reports", "Employee Report"],
    "/hrms/reports/daily":        ["People", "Reports", "Daily Attendance"],
    "/hrms/reports/field":        ["People", "Reports", "Field Attendance"],
    "/hrms/reports/late-early":   ["People", "Reports", "Late Coming / Early Going"],
    "/hrms/leave":              ["People", "Leave & Policy", "Leave record"],
    "/hrms/leave/record":       ["People", "Leave & Policy", "Leave record"],
    "/hrms/leave/apply":        ["People", "Leave & Policy", "Apply leave"],
    "/hrms/leave/approval":     ["People", "Leave & Policy", "Leave approval"],
    "/hrms/leave/admin":        ["People", "Leave & Policy", "Leave admin"],
    "/hrms/leave/policy":       ["People", "Leave & Policy", "Leave admin"],
    "/hrms/holidays":           ["People", "Leave & Policy", "Leave admin"],
    "/hrms/salary":            ["People", "HR Management", "Salary"],
    "/hrms/salary/monthly":    ["People", "HR Management", "Monthly salary"],
    "/hrms/salary/bulk":       ["People", "HR Management", "Payroll bulk view"],
    "/hrms/salary/daily-wage": ["People", "HR Management", "Daily wage payroll"],
    "/hrms/payroll":           ["People", "Reports", "Payroll"],
    "/reports":              ["System", "Reports"],
    "/users":                ["System", "User Management"],
    "/design-system":        ["System", "Design System"],
  };
  return map[route] || [route];
};

const Topbar = ({ route, onNotifClick, onMobileClick, onLogout, onMenuClick, menuOpen }) => {
  const crumbs = breadcrumbsFor(route);
  return (
    <header className="topbar">
      <button
        type="button"
        className="tb-menu-btn tb-iconbtn"
        onClick={onMenuClick}
        title={menuOpen ? "Close menu" : "Open menu"}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        <Icon name={menuOpen ? "x" : "menu"} size={18} />
      </button>

      <div className="tb-bread">
        <span className="crumb"><Icon name="home" size={14} /></span>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className="sep"><Icon name="chevRight" size={12} /></span>
            <span className={`crumb ${i === crumbs.length - 1 ? "last" : ""}`}>{c}</span>
          </React.Fragment>
        ))}
      </div>

      <div className="tb-actions">
        <button className="tb-iconbtn" title="Mobile preview" onClick={onMobileClick}>
          <Icon name="phone" size={15} />
        </button>
        <button className="tb-iconbtn" title="Help"><Icon name="help" size={15} /></button>
        <button className="tb-iconbtn" onClick={onNotifClick} title="Notifications">
          <Icon name="bell" size={15} />
          <span className="dot"></span>
        </button>
        <div className="divider v"></div>
        <button className="btn ghost" onClick={onLogout}>
          <Icon name="logout" size={13} />
        </button>
      </div>
    </header>
  );
};

export { Sidebar, Topbar, NAV };
