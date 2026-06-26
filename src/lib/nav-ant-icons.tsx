import type { ComponentType } from "react";
import {
  AppstoreOutlined,
  BarChartOutlined,
  BuildOutlined,
  CalendarOutlined,
  CarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  GiftOutlined,
  GlobalOutlined,
  InboxOutlined,
  LayoutOutlined,
  PlusOutlined,
  SafetyOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";

/** Sidebar nav icon name → Ant Design icon */
export const NAV_ANT_ICONS: Record<string, ComponentType> = {
  shield: SafetyOutlined,
  crown: CrownOutlined,
  factory: BuildOutlined,
  truck: CarOutlined,
  box: InboxOutlined,
  package: GiftOutlined,
  wrench: ToolOutlined,
  users: TeamOutlined,
  user: UserOutlined,
  cart: ShoppingCartOutlined,
  invoice: FileTextOutlined,
  ticket: FileDoneOutlined,
  chart: BarChartOutlined,
  pin: EnvironmentOutlined,
  map: GlobalOutlined,
  clock: ClockCircleOutlined,
  calendar: CalendarOutlined,
  money: DollarOutlined,
  plus: PlusOutlined,
  layout: LayoutOutlined,
  check: CheckOutlined,
  settings: SettingOutlined,
  dashboard: AppstoreOutlined,
};

export function getNavAntIcon(iconName?: string): ComponentType {
  return NAV_ANT_ICONS[iconName || "user"] ?? UserOutlined;
}
