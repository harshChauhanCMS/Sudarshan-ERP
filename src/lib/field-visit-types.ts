export const FIELD_VISIT_STATUSES = [
  "pending",
  "accepted",
  "in-progress",
  "completed",
  "cancelled",
] as const;

export type FieldVisitStatus = (typeof FIELD_VISIT_STATUSES)[number];

export const FIELD_VISIT_TYPES = ["Customer", "Vendor", "Market", "Other"] as const;

export type FieldVisitType = (typeof FIELD_VISIT_TYPES)[number];

export type FieldVisitLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
  city?: string;
  state?: string;
};

export type CreateFieldVisitPayload = {
  assignedEmployeeId: string;
  company: string;
  visitDate: string;
  visitType: FieldVisitType;
  partyName: string;
  locationText: string;
  startTime?: string;
  returnTime?: string;
  purpose?: string;
  notes?: string;
};

export type FieldVisitView = {
  id: string;
  visitId: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  assignedEmployeeEmail: string;
  createdByEmail: string;
  createdByName: string;
  company: string;
  visitDate: string;
  visitType: FieldVisitType;
  partyName: string;
  locationText: string;
  startTime: string;
  returnTime: string;
  purpose: string;
  notes: string;
  status: FieldVisitStatus;
  acceptedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  visitLocation?: FieldVisitLocation;
  createdAt: string;
  updatedAt: string;
};

export type FieldActivityEmployee = {
  employeeId: string;
  name: string;
  status: string;
  badge: "field" | "office" | "done" | "delayed" | "onsite";
  city?: string;
  lat?: number;
  lng?: number;
  punchedAt?: string;
  workLocationType?: string;
};

export type FieldActivityDashboard = {
  kpis: {
    employeesInField: number;
    visitsCompletedToday: number;
    pendingVisits: number;
    avgVisitDurationMinutes: number | null;
  };
  liveEmployees: FieldActivityEmployee[];
  mapEmployees: Array<{
    employeeId: string;
    label: string;
    city: string;
    lat: number;
    lng: number;
    color: string;
    initials: string;
  }>;
  activeVisits: FieldVisitView[];
  todayVisits: FieldVisitView[];
  timeline: Array<{
    time: string;
    title: string;
    sub: string;
    status: FieldVisitStatus;
  }>;
  territorySummary: Array<{ area: string; visits: number }>;
};
