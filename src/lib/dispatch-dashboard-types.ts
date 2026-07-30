/**
 * View model for GET /api/dispatch/dashboard — everything the Dispatch
 * Dashboard (`/dashboard/dispatch`) renders, computed server-side from
 * ORDERS + DISPATCHES + PACKAGING so no screen section has to invent data.
 */

export type DispatchDashboardStats = {
  dueToday: number;
  overdue: number;
  vehiclesAssigned: number;
  inTransit: number;
  packagingBlock: number;
  completedToday: number;
};

/** One plant/company bucket — labels come from COMPANIES, not hardcoded. */
export type PlantCount = {
  plant: string;
  count: number;
};

export type PlantDueOverdue = {
  plant: string;
  due: number;
  overdue: number;
};

export type CalendarPoint = {
  /** Day-of-month as a string, for the bar label. */
  day: string;
  /** ISO date the bar represents. */
  date: string;
  dispatches: number;
};

/**
 * The calendar's own fixed window. Deliberately independent of the schedule
 * filter: the calendar is an at-a-glance view of what is coming up, so it must
 * not move when someone narrows the overdue/due list to look at one day.
 */
export type CalendarWindow = {
  from: string;
  to: string;
};

/**
 * Which record a row came from, so the UI can link it to its own page:
 * `dispatchId` → /dispatch/[id], `orderId` → /orders/[id]. An outstanding
 * order that has not been planned yet has no dispatch, hence the nulls.
 */
export type RowEntity = {
  dispatchId: string | null;
  orderId: string | null;
};

/** One line in the merged "Overdue & due orders" section. */
export type ScheduleRow = RowEntity & {
  id: string;
  /** Overdue = date before today; due = today or later, inside the range. */
  kind: "overdue" | "due";
  customer: string;
  customerShort: string;
  product: string;
  qty: string;
  mt: number;
  /** ISO day the item is scheduled for. */
  date: string;
  dateLabel: string;
  plant: string;
  /** 0 for anything not overdue. */
  daysLate: number;
  note: string;
};

/**
 * The merged overdue + due-orders section. Its `from`/`to` window also drives
 * the dispatch calendar, so the two always describe the same period.
 */
export type DispatchSchedule = {
  from: string;
  to: string;
  /** Rows in the window before the display cap, for "showing N of M". */
  matchCount: number;
  overdueCount: number;
  dueCount: number;
  totalMt: number;
  rows: ScheduleRow[];
  /** Chart series: order volume by customer across the window. */
  byCustomer: { customer: string; customerShort: string; mt: number }[];
};

export type PackagingBlockRow = RowEntity & {
  id: string;
  customer: string;
  text: string;
};

export type DelayReasonRow = {
  reason: string;
  count: number;
};

export type TrackingCounts = {
  loading: number;
  inTransit: number;
  ready: number;
};

export type VehicleTrackingRow = {
  id: string;
  reg: string;
  status: string;
};

/** Tone vocabulary shared by `.disp-dash-track-dot` and `.disp-dash-vehicles__badge`. */
export type DispatchTone = "transit" | "loading" | "ready";

export type DriverTrackingRow = {
  id: string;
  reg: string;
  driver: string;
  title: string;
  meta: string;
  tone: DispatchTone;
};

export type VehicleAssignmentRow = {
  id: string;
  reg: string;
  driver: string;
  status: string;
  tone: DispatchTone;
};

export type DelayedAlertRow = {
  id: string;
  text: string;
};

export type CustomerDispatchRow = {
  customer: string;
  customerShort: string;
  mt: number;
  dispatched: number;
  pending: number;
};

export type DispatchDashboardOverview = {
  stats: DispatchDashboardStats;
  /** Chart: "Dispatch due today" — due count split by company. */
  dueTodayByPlant: PlantCount[];
  /** Chart: "Company-wise dispatch" — due vs overdue by company. */
  companyDispatch: PlantDueOverdue[];
  /** Chart: "Dispatch calendar" — counts per day across its own fixed window. */
  calendar: CalendarPoint[];
  calendarWindow: CalendarWindow;
  /** Merged "Overdue & due orders" section, scoped to the from/to filter. */
  schedule: DispatchSchedule;
  /** List: "Dispatches pending — packaging shortage". */
  packagingBlocks: PackagingBlockRow[];
  /** Chart: "Delayed dispatch reasons summary". */
  delayReasons: DelayReasonRow[];
  /** Pills + list: "Simple vehicle tracking status". */
  trackingCounts: TrackingCounts;
  vehicleTracking: VehicleTrackingRow[];
  /** List: "Driver / vehicle tracking". */
  driverTracking: DriverTrackingRow[];
  /** Panel: "Delayed dispatch alert". */
  delayedAlerts: DelayedAlertRow[];
  /** List: "Vehicle assignment". */
  vehicleAssignments: VehicleAssignmentRow[];
  /** Chart: "Customer-wise dispatch summary". */
  customerSummary: CustomerDispatchRow[];
  /** Plant labels in chart order, so the legend matches the bars. */
  plantLabels: string[];
  packagingNote: string;
  companyLabel: string;
  hasData: boolean;
  generatedAt: string;
};
