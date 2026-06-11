"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spin, Tag, Tabs, message } from "antd";
import {
  BellOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

import PageHeader from "@/components/common/PageHeader";
import { HRMS_BACK } from "@/lib/hrms-nav";

type NotificationRow = {
  id: string;
  type: string;
  category: string;
  text: string;
  time: string;
  target: string;
  read: boolean;
  employeeId?: string;
  punchType?: string;
  createdAt: string;
};

type FilterTab = "all" | "unread" | "read";

function tabLabel(name: string, count: number) {
  return (
    <span className="notif-tab-label">
      {name}
      <span className="notif-tab-count">{count}</span>
    </span>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (filter: FilterTab = activeTab) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filter !== "all") params.set("filter", filter);
      const res = await fetch(`/api/notifications?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setRows(json.data?.notifications ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
      setTotalCount(json.data?.totalCount ?? json.data?.notifications?.length ?? 0);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to load notifications");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed");
      message.success("All notifications marked as read");
      void load(activeTab);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to update");
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setRows((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      /* non-blocking */
    }
  };

  const openNotification = (n: NotificationRow) => {
    if (!n.read) void markRead(n.id);
    router.push(n.target || "/hrms/attendance");
  };

  const readCount = useMemo(
    () => Math.max(0, totalCount - unreadCount),
    [totalCount, unreadCount]
  );

  const tabItems = [
    { key: "all", label: tabLabel("All", totalCount) },
    { key: "unread", label: tabLabel("Unread", unreadCount) },
    { key: "read", label: tabLabel("Read", readCount) },
  ];

  return (
    <div className="attendance-reports-page notif-page">
      <PageHeader
        compact
        {...HRMS_BACK.notifications}
        title="Notifications"
        subtitle="Attendance punch alerts for your team"
        actions={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => load(activeTab)}
            loading={loading}
          >
            Refresh
          </Button>
        }
      />

      <div className="attendance-report-section notif-page-panel">
        <div className="notif-page-toolbar">
          <Tabs
            activeKey={activeTab}
            onChange={(k) => setActiveTab(k as FilterTab)}
            items={tabItems}
          />
          {unreadCount > 0 ? (
            <Button
              type="link"
              className="notif-page-mark-all"
              onClick={() => void markAllRead()}
            >
              Mark all as read
            </Button>
          ) : null}
        </div>

        <div className="attendance-report-section__body attendance-report-section__body--flush">
          {loading ? (
            <div className="notif-page-empty notif-page-empty--loading">
              <Spin />
              <p>Loading notifications…</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="notif-page-empty">
              <div className="notif-page-empty__icon" aria-hidden>
                <BellOutlined />
              </div>
              <p className="notif-page-empty__title">No notifications</p>
              <p className="notif-page-empty__hint">
                Punch in/out alerts for your team will appear here.
              </p>
            </div>
          ) : (
            <ul className="notif-page-list">
              {rows.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-page-item${n.read ? "" : " notif-page-item--unread"}`}
                    onClick={() => openNotification(n)}
                  >
                    <span
                      className={`notif-page-item__icon notif-page-item__icon--${n.type}`}
                      aria-hidden
                    >
                      {n.punchType === "in" ? (
                        <LoginOutlined />
                      ) : n.punchType === "out" ? (
                        <LogoutOutlined />
                      ) : (
                        <BellOutlined />
                      )}
                    </span>

                    <span className="notif-page-item__content">
                      <span className="notif-page-item__text">{n.text}</span>
                      <span className="notif-page-item__meta">
                        {n.category === "attendance" ? (
                          <Tag
                            bordered={false}
                            color={n.punchType === "in" ? "green" : "blue"}
                          >
                            {n.punchType === "in" ? "Punch in" : "Punch out"}
                          </Tag>
                        ) : (
                          <Tag bordered={false}>{n.category}</Tag>
                        )}
                        <time className="notif-page-item__time">
                          {n.createdAt
                            ? dayjs(n.createdAt).format("DD MMM YYYY, hh:mm A")
                            : n.time}
                        </time>
                        {!n.read ? (
                          <Tag bordered={false} color="orange">
                            New
                          </Tag>
                        ) : null}
                      </span>
                    </span>

                    <RightOutlined
                      className="notif-page-item__chevron"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
