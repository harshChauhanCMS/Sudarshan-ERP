"use client";

import { Table } from "antd";
import type { TablePaginationConfig, TableProps } from "antd";
import type { AnyObject } from "antd/es/_util/type";
import { useEffect, useMemo, useRef, useState } from "react";

export type CommonTableColumn<RecordType> = NonNullable<
  TableProps<RecordType>["columns"]
>[number];

export interface CommonTableProps<RecordType extends AnyObject>
  extends Omit<TableProps<RecordType>, "columns" | "dataSource"> {
  columns: CommonTableColumn<RecordType>[];
  dataSource: readonly RecordType[];
}

const DEFAULT_PAGE_SIZE = 10;

const DEFAULT_PAGINATION: TablePaginationConfig = {
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ["10", "20", "50", "100"],
  showTotal: (total) => `Total ${total} items`,
};

function readInitialPageSize(pagination: CommonTableProps<AnyObject>["pagination"]) {
  if (pagination === false) return DEFAULT_PAGE_SIZE;
  const merged = {
    ...DEFAULT_PAGINATION,
    ...(typeof pagination === "object" ? pagination : {}),
  };
  return merged.pageSize ?? DEFAULT_PAGE_SIZE;
}

export default function CommonTable<RecordType extends AnyObject>({
  columns,
  dataSource,
  rowKey,
  pagination,
  size = "middle",
  bordered = false,
  scroll,
  className,
  ...rest
}: CommonTableProps<RecordType>) {
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(() =>
    readInitialPageSize(pagination)
  );
  const prevDataLength = useRef(dataSource.length);

  useEffect(() => {
    if (prevDataLength.current !== dataSource.length) {
      setTablePage(1);
      prevDataLength.current = dataSource.length;
    }
  }, [dataSource.length]);

  const resolvedRowKey = useMemo<TableProps<RecordType>["rowKey"]>(() => {
    if (rowKey) return rowKey;
    const sample = dataSource[0];
    if (sample && typeof sample === "object") {
      if ("id" in sample) return "id" as keyof RecordType as never;
      if ("key" in sample) return "key" as keyof RecordType as never;
    }
    return undefined;
  }, [rowKey, dataSource]);

  const resolvedPagination = useMemo(() => {
    if (pagination === false) return false as const;

    const merged: TablePaginationConfig = {
      ...DEFAULT_PAGINATION,
      ...(typeof pagination === "object" ? pagination : {}),
    };
    const { pageSize: _pageSize, current: _current, onChange, onShowSizeChange, ...restConfig } =
      merged;

    return {
      ...restConfig,
      current: tablePage,
      pageSize: tablePageSize,
      onChange: (page: number, size: number) => {
        setTablePage(page);
        setTablePageSize(size);
        onChange?.(page, size);
      },
      onShowSizeChange: (_page: number, size: number) => {
        setTablePage(1);
        setTablePageSize(size);
        onShowSizeChange?.(_page, size);
      },
    };
  }, [pagination, tablePage, tablePageSize]);

  return (
    <Table<RecordType>
      className={["attendance-report-table", className].filter(Boolean).join(" ")}
      columns={columns}
      dataSource={dataSource as RecordType[]}
      rowKey={resolvedRowKey}
      pagination={resolvedPagination}
      size={size}
      bordered={bordered}
      scroll={scroll ?? { x: "max-content" }}
      {...rest}
    />
  );
}
