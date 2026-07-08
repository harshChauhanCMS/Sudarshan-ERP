"use client";

import { useState, type ReactNode } from "react";
import PageFilterToolbar from "./PageFilterToolbar";
import PageFilterDrawer from "./PageFilterDrawer";

export interface PageFilterPanelProps {
  // Toolbar props
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  activeFilterCount?: number;
  showFilterButton?: boolean;
  trailing?: ReactNode;
  toolbarClassName?: string;
  
  // Drawer props
  onApply: () => void;
  onClear?: () => void;
  loading?: boolean;
  drawerTitle?: string;
  drawerWidth?: number;
  children: ReactNode;
}

export default function PageFilterPanel({
  search,
  onSearchChange,
  searchPlaceholder,
  activeFilterCount = 0,
  showFilterButton = true,
  trailing,
  toolbarClassName,
  
  onApply,
  onClear,
  loading,
  drawerTitle,
  drawerWidth,
  children,
}: PageFilterPanelProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <PageFilterToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        onFilterClick={() => setDrawerOpen(true)}
        activeFilterCount={activeFilterCount}
        showFilterButton={showFilterButton}
        trailing={trailing}
        className={toolbarClassName}
      />

      <PageFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={onApply}
        onClear={onClear}
        loading={loading}
        title={drawerTitle}
        width={drawerWidth}
      >
        {children}
      </PageFilterDrawer>
    </>
  );
}
