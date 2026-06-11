"use client";

import { Input } from "antd";
import { SearchOutlined } from "@ant-design/icons";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function FilterSearchField({
  value,
  onChange,
  placeholder = "Search name, ID, department…",
}: Props) {
  return (
    <div className="arf-item ap-filters-search-field">
      <span className="arf-label">Search</span>
      <Input
        allowClear
        placeholder={placeholder}
        prefix={<SearchOutlined style={{ color: "var(--fg-muted)" }} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
