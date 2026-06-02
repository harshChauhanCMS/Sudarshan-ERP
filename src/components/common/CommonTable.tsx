"use client";

import { Table } from "antd";
import type { TableProps } from "antd";
import type { AnyObject } from "antd/es/_util/type";
import { useMemo } from "react";

export type CommonTableColumn<RecordType> = NonNullable<
  TableProps<RecordType>["columns"]
>[number];

export interface CommonTableProps<RecordType extends AnyObject>
  extends Omit<TableProps<RecordType>, "columns" | "dataSource"> {
  columns: CommonTableColumn<RecordType>[];
  dataSource: readonly RecordType[];
}

const DEFAULT_PAGINATION: TableProps<AnyObject>["pagination"] = {
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total) => `Total ${total} items`,
};

export default function CommonTable<RecordType extends AnyObject>({
  columns,
  dataSource,
  rowKey,
  pagination,
  size = "middle",
  bordered = true,
  scroll,
  className,
  ...rest
}: CommonTableProps<RecordType>) {
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
    return { ...DEFAULT_PAGINATION, ...(pagination ?? {}) };
  }, [pagination]);

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
