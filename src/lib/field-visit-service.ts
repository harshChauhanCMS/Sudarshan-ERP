import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import FieldVisitAssignment from "@/lib/models/FieldVisitAssignment";
import AttendancePunch from "@/lib/models/AttendancePunch";
import type {
  CreateFieldVisitPayload,
  FieldActivityDashboard,
  FieldActivityEmployee,
  FieldVisitLocation,
  FieldVisitStatus,
  FieldVisitView,
} from "@/lib/field-visit-types";
import {
  notifyFieldVisitAssigned,
  notifyFieldVisitStatusChange,
} from "@/lib/field-visit-notifications";
import { enrichLocation } from "@/lib/reverse-geocode";

const MAP_COLORS = ["#0d9488", "#374d95", "#0369a1", "#16a34a", "#6b7280", "#b45309"];

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

async function nextVisitId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `FV-${year}-`;
  const last = await FieldVisitAssignment.findOne({ visitId: new RegExp(`^${prefix}`) })
    .sort({ visitId: -1 })
    .lean();
  const lastNum = last?.visitId
    ? parseInt(String(last.visitId).replace(prefix, ""), 10)
    : 0;
  return `${prefix}${String((Number.isFinite(lastNum) ? lastNum : 0) + 1).padStart(4, "0")}`;
}

function toView(doc: Record<string, unknown>): FieldVisitView {
  const visitDate = doc.visitDate instanceof Date ? doc.visitDate : new Date(String(doc.visitDate));
  return {
    id: String(doc._id),
    visitId: String(doc.visitId),
    assignedEmployeeId: String(doc.assignedEmployeeId),
    assignedEmployeeName: String(doc.assignedEmployeeName),
    assignedEmployeeEmail: String(doc.assignedEmployeeEmail),
    createdByEmail: String(doc.createdByEmail),
    createdByName: String(doc.createdByName ?? ""),
    company: String(doc.company ?? "smi"),
    visitDate: formatDateOnly(visitDate),
    visitType: doc.visitType as FieldVisitView["visitType"],
    partyName: String(doc.partyName),
    locationText: String(doc.locationText ?? ""),
    startTime: String(doc.startTime ?? "09:00"),
    returnTime: String(doc.returnTime ?? "17:00"),
    purpose: String(doc.purpose ?? ""),
    notes: String(doc.notes ?? ""),
    status: doc.status as FieldVisitStatus,
    acceptedAt: doc.acceptedAt ? new Date(doc.acceptedAt as string).toISOString() : undefined,
    completedAt: doc.completedAt ? new Date(doc.completedAt as string).toISOString() : undefined,
    cancelledAt: doc.cancelledAt ? new Date(doc.cancelledAt as string).toISOString() : undefined,
    cancelReason: doc.cancelReason ? String(doc.cancelReason) : undefined,
    visitLocation: doc.visitLocation as FieldVisitLocation | undefined,
    createdAt: new Date(doc.createdAt as string).toISOString(),
    updatedAt: new Date(doc.updatedAt as string).toISOString(),
  };
}

export async function createFieldVisit(
  payload: CreateFieldVisitPayload,
  creator: { email: string; name?: string }
): Promise<FieldVisitView> {
  await connectDB();

  const employee = await Employee.findOne({ employeeId: payload.assignedEmployeeId }).lean();
  if (!employee) throw new Error("Assigned employee not found");

  const email =
    String(employee.officialEmail || employee.personalEmail || "").trim().toLowerCase();
  if (!email) throw new Error("Assigned employee has no email for notifications");

  const visitDate = new Date(payload.visitDate);
  if (Number.isNaN(visitDate.getTime())) throw new Error("Invalid visit date");

  const created = await FieldVisitAssignment.create({
    visitId: await nextVisitId(),
    assignedEmployeeId: String(employee.employeeId),
    assignedEmployeeName: String(employee.fullName),
    assignedEmployeeEmail: email,
    createdByEmail: creator.email.trim().toLowerCase(),
    createdByName: creator.name?.trim() || creator.email,
    company: payload.company?.trim() || "smi",
    visitDate,
    visitType: payload.visitType,
    partyName: payload.partyName.trim(),
    locationText: payload.locationText?.trim() || "",
    startTime: payload.startTime?.trim() || "09:00",
    returnTime: payload.returnTime?.trim() || "17:00",
    purpose: payload.purpose?.trim() || "",
    notes: payload.notes?.trim() || "",
    status: "pending",
  });

  const view = toView(created.toObject());
  void notifyFieldVisitAssigned(view);
  return view;
}

export async function listFieldVisits(filters?: {
  employeeId?: string;
  email?: string;
  status?: string;
  limit?: number;
}): Promise<FieldVisitView[]> {
  await connectDB();
  const query: Record<string, unknown> = {};
  if (filters?.employeeId) query.assignedEmployeeId = filters.employeeId;
  if (filters?.email) query.assignedEmployeeEmail = filters.email.trim().toLowerCase();
  if (filters?.status) query.status = filters.status;

  const rows = await FieldVisitAssignment.find(query)
    .sort({ visitDate: -1, createdAt: -1 })
    .limit(filters?.limit ?? 100)
    .lean();

  return rows.map((r) => toView(r as Record<string, unknown>));
}

async function getVisitDoc(id: string) {
  await connectDB();
  const byMongo = await FieldVisitAssignment.findById(id).lean();
  if (byMongo) return byMongo;
  return FieldVisitAssignment.findOne({ visitId: id }).lean();
}

export async function acceptFieldVisit(
  id: string,
  actor: { email: string; employeeId?: string },
  locationInput?: FieldVisitLocation
): Promise<FieldVisitView> {
  const doc = await getVisitDoc(id);
  if (!doc) throw new Error("Visit not found");
  if (doc.status !== "pending") throw new Error("Only pending visits can be accepted");

  const actorEmail = actor.email.trim().toLowerCase();
  if (doc.assignedEmployeeEmail !== actorEmail) {
    throw new Error("Only the assigned employee can accept this visit");
  }

  const now = new Date();
  const patch: Record<string, unknown> = {
    status: "accepted",
    acceptedAt: now,
  };

  if (locationInput) {
    const enriched = await enrichLocation(locationInput);
    patch.visitLocation = enriched;
    patch.status = "in-progress";
  }

  const updated = await FieldVisitAssignment.findByIdAndUpdate(
    doc._id,
    { $set: patch },
    { new: true }
  ).lean();

  const view = toView(updated as Record<string, unknown>);
  void notifyFieldVisitStatusChange(view, "accepted");
  return view;
}

export async function completeFieldVisit(
  id: string,
  actor: { email: string },
  notes?: string
): Promise<FieldVisitView> {
  const doc = await getVisitDoc(id);
  if (!doc) throw new Error("Visit not found");
  if (!["accepted", "in-progress"].includes(String(doc.status))) {
    throw new Error("Visit must be accepted before completion");
  }

  const actorEmail = actor.email.trim().toLowerCase();
  if (doc.assignedEmployeeEmail !== actorEmail) {
    throw new Error("Only the assigned employee can complete this visit");
  }

  const updated = await FieldVisitAssignment.findByIdAndUpdate(
    doc._id,
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        ...(notes?.trim() ? { notes: notes.trim() } : {}),
      },
    },
    { new: true }
  ).lean();

  const view = toView(updated as Record<string, unknown>);
  void notifyFieldVisitStatusChange(view, "completed");
  return view;
}

export async function cancelFieldVisit(
  id: string,
  actor: { email: string },
  reason: string
): Promise<FieldVisitView> {
  const doc = await getVisitDoc(id);
  if (!doc) throw new Error("Visit not found");
  if (["completed", "cancelled"].includes(String(doc.status))) {
    throw new Error("This visit is already closed");
  }

  const actorEmail = actor.email.trim().toLowerCase();
  if (doc.assignedEmployeeEmail !== actorEmail) {
    throw new Error("Only the assigned employee can cancel this visit");
  }

  if (!reason?.trim()) throw new Error("Cancellation reason is required");

  const updated = await FieldVisitAssignment.findByIdAndUpdate(
    doc._id,
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason.trim(),
      },
    },
    { new: true }
  ).lean();

  const view = toView(updated as Record<string, unknown>);
  void notifyFieldVisitStatusChange(view, "cancelled");
  return view;
}

export async function getFieldActivityDashboard(): Promise<FieldActivityDashboard> {
  await connectDB();

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [todayVisits, todayPunches, activeEmployees] = await Promise.all([
    FieldVisitAssignment.find({
      visitDate: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ createdAt: -1 })
      .lean(),
    AttendancePunch.find({
      punchedAt: { $gte: todayStart, $lte: todayEnd },
      punchType: "in",
      location: { $exists: true },
    })
      .sort({ punchedAt: -1 })
      .lean(),
    Employee.find({})
      .select({
        employeeId: 1,
        fullName: 1,
        workLocationType: 1,
        locationUnit: 1,
        officialEmail: 1,
        personalEmail: 1,
      })
      .lean(),
  ]);

  const employeeMap = new Map(
    activeEmployees.map((e) => [String(e.employeeId), e])
  );

  const visits = todayVisits.map((v) => toView(v as Record<string, unknown>));
  const completedToday = visits.filter((v) => v.status === "completed").length;
  const pendingVisits = visits.filter((v) => v.status === "pending").length;
  const inFieldVisits = visits.filter((v) =>
    ["accepted", "in-progress"].includes(v.status)
  ).length;

  const liveEmployees: FieldActivityEmployee[] = [];
  const mapEmployees: FieldActivityDashboard["mapEmployees"] = [];
  const seenPunchEmp = new Set<string>();

  for (const punch of todayPunches) {
    const empId = punch.employeeId ? String(punch.employeeId) : "";
    if (!empId || seenPunchEmp.has(empId)) continue;

    const emp = employeeMap.get(empId);
    const workType = String(emp?.workLocationType || "Onsite");
    if (!["Onsite", "Field"].includes(workType)) continue;

    const lastPunch = await AttendancePunch.findOne({
      employeeId: empId,
      punchedAt: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ punchedAt: -1 })
      .lean();

    if (lastPunch?.punchType === "out") continue;

    seenPunchEmp.add(empId);
    const loc = punch.location as FieldVisitLocation | undefined;
    const name = emp ? String(emp.fullName) : empId;
    const city = loc?.city || loc?.address?.split(",")[0] || "On site";

    liveEmployees.push({
      employeeId: empId,
      name,
      status: workType === "Field" ? "IN FIELD" : "ON SITE",
      badge: workType === "Field" ? "field" : "onsite",
      city,
      lat: loc?.lat,
      lng: loc?.lng,
      punchedAt: new Date(punch.punchedAt).toISOString(),
      workLocationType: workType,
    });

    if (loc?.lat != null && loc?.lng != null) {
      mapEmployees.push({
        employeeId: empId,
        label: name,
        city,
        lat: loc.lat,
        lng: loc.lng,
        color: MAP_COLORS[mapEmployees.length % MAP_COLORS.length],
        initials: initials(name),
      });
    }
  }

  for (const visit of visits) {
    if (!["accepted", "in-progress"].includes(visit.status)) continue;
    if (liveEmployees.some((e) => e.employeeId === visit.assignedEmployeeId)) continue;
    liveEmployees.push({
      employeeId: visit.assignedEmployeeId,
      name: visit.assignedEmployeeName,
      status: "VISIT IN PROGRESS",
      badge: "field",
      city: visit.locationText || visit.partyName,
    });
  }

  const durations = visits
    .filter((v) => v.acceptedAt && v.completedAt)
    .map((v) => {
      const start = new Date(v.acceptedAt!).getTime();
      const end = new Date(v.completedAt!).getTime();
      return Math.max(0, Math.round((end - start) / 60000));
    });
  const avgVisitDurationMinutes = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const territoryMap = new Map<string, number>();
  for (const visit of visits) {
    const area = visit.locationText?.split(",")[0]?.trim() || "Other";
    territoryMap.set(area, (territoryMap.get(area) ?? 0) + 1);
  }

  const timeline = visits.slice(0, 8).map((v) => ({
    time: v.startTime || "—",
    title: `${v.assignedEmployeeName} — ${v.partyName} (${v.status})`,
    sub: `${v.visitType} · ${v.locationText || "—"}`,
    status: v.status,
  }));

  return {
    kpis: {
      employeesInField: liveEmployees.length || inFieldVisits,
      visitsCompletedToday: completedToday,
      pendingVisits,
      avgVisitDurationMinutes,
    },
    liveEmployees,
    mapEmployees,
    activeVisits: visits.filter((v) => !["completed", "cancelled"].includes(v.status)),
    todayVisits: visits,
    timeline,
    territorySummary: [...territoryMap.entries()]
      .map(([area, count]) => ({ area, visits: count }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 6),
  };
}
