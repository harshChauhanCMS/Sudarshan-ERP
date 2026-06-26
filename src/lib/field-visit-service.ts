import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import FieldVisitAssignment from "@/lib/models/FieldVisitAssignment";
import AttendancePunch from "@/lib/models/AttendancePunch";
import type {
  CreateFieldVisitPayload,
  CreateSelfFieldVisitPayload,
  FieldActivityDashboard,
  FieldActivityEmployee,
  FieldVisitLocation,
  FieldVisitStatus,
  FieldVisitView,
} from "@/lib/field-visit-types";
import {
  notifyFieldVisitAssigned,
  notifyFieldVisitSelfCreated,
  notifyFieldVisitStatusChange,
} from "@/lib/field-visit-notifications";
import { enrichLocation } from "@/lib/reverse-geocode";
import {
  fieldVisitDayBoundsIST,
  formatFieldVisitDateYmdIST,
  parseFieldVisitDateYmd,
} from "@/lib/field-visit-dates";
import { isFieldWorkLocation } from "@/lib/hrms-employee-options";

const MAP_COLORS = ["#0d9488", "#374d95", "#0369a1", "#16a34a", "#6b7280", "#b45309"];

function formatDateOnly(d: Date): string {
  return formatFieldVisitDateYmdIST(d);
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
    selfInitiated:
      String(doc.createdByEmail).trim().toLowerCase() ===
      String(doc.assignedEmployeeEmail).trim().toLowerCase(),
  };
}

export async function createFieldVisit(
  payload: CreateFieldVisitPayload,
  creator: { email: string; name?: string },
  options?: { notifyEmployee?: boolean; autoAccept?: boolean }
): Promise<FieldVisitView> {
  await connectDB();

  const employee = await Employee.findOne({ employeeId: payload.assignedEmployeeId }).lean();
  if (!employee) throw new Error("Assigned employee not found");

  const email =
    String(employee.officialEmail || employee.personalEmail || "").trim().toLowerCase();
  if (!email) throw new Error("Assigned employee has no email for notifications");

  const visitDate = parseFieldVisitDateYmd(payload.visitDate);

  const acceptedAt = options?.autoAccept ? new Date() : undefined;

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
    status: options?.autoAccept ? "accepted" : "pending",
    ...(acceptedAt ? { acceptedAt } : {}),
  });

  const view = toView(created.toObject());
  if (options?.notifyEmployee !== false) {
    void notifyFieldVisitAssigned(view);
  }
  return view;
}

export async function createSelfFieldVisit(
  payload: CreateSelfFieldVisitPayload,
  creator: { email: string; name?: string; employeeId: string }
): Promise<FieldVisitView> {
  const view = await createFieldVisit(
    { ...payload, assignedEmployeeId: creator.employeeId },
    { email: creator.email, name: creator.name },
    { notifyEmployee: false, autoAccept: true }
  );
  void notifyFieldVisitSelfCreated(view);
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

  const isSelfInitiated =
    String(doc.createdByEmail).trim().toLowerCase() ===
    String(doc.assignedEmployeeEmail).trim().toLowerCase();
  const allowedStatuses = isSelfInitiated
    ? ["pending", "accepted", "in-progress"]
    : ["accepted", "in-progress"];

  if (!allowedStatuses.includes(String(doc.status))) {
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
        ...(doc.status === "pending" ? { acceptedAt: new Date() } : {}),
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

  const { start: todayStart, end: todayEnd } = fieldVisitDayBoundsIST();

  const [todayVisitRows, todayPunches, activeEmployees] = await Promise.all([
    FieldVisitAssignment.find({
      $or: [
        { visitDate: { $gte: todayStart, $lte: todayEnd } },
        { createdAt: { $gte: todayStart, $lte: todayEnd } },
      ],
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

  const visits = todayVisitRows.map((v) => toView(v as Record<string, unknown>));
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
    sub: [
      v.selfInitiated ? "Self-scheduled" : "Assigned",
      v.visitType,
      v.locationText || "—",
      v.visitDate,
    ].join(" · "),
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

export type OwnerEmployeesInFieldRow = {
  key: string;
  name: string;
  role: string;
  href?: string;
};

export type OwnerFieldVisitRow = {
  key: string;
  customer: string;
  rep: string;
  href?: string;
};

function isFieldPunchIn(
  punch: { notes?: string | null },
  workLocationType?: string | null,
): boolean {
  if (isFieldWorkLocation(workLocationType)) return true;
  return String(punch.notes ?? "").includes("Field");
}

/** Employees currently punched in from the field (mobile GPS punch-in, not punched out). */
export async function getEmployeesInFieldFromPunches(): Promise<{
  fieldCount: number;
  employees: OwnerEmployeesInFieldRow[];
}> {
  await connectDB();

  const { start: todayStart, end: todayEnd } = fieldVisitDayBoundsIST();

  const todayPunches = await AttendancePunch.find({
    punchedAt: { $gte: todayStart, $lte: todayEnd },
    location: { $exists: true },
    "location.lat": { $exists: true },
    "location.lng": { $exists: true },
  })
    .sort({ punchedAt: 1 })
    .lean();

  if (todayPunches.length === 0) {
    return { fieldCount: 0, employees: [] };
  }

  const punchesByKey = new Map<string, typeof todayPunches>();
  for (const punch of todayPunches) {
    const key = punch.employeeId
      ? `id:${String(punch.employeeId)}`
      : punch.userEmail
        ? `email:${String(punch.userEmail).toLowerCase()}`
        : "";
    if (!key) continue;
    const list = punchesByKey.get(key) ?? [];
    list.push(punch);
    punchesByKey.set(key, list);
  }

  const employeeIds = [
    ...new Set(
      todayPunches
        .map((p) => (p.employeeId ? String(p.employeeId) : ""))
        .filter(Boolean),
    ),
  ];
  const emails = [
    ...new Set(
      todayPunches
        .map((p) => (p.userEmail ? String(p.userEmail).toLowerCase() : ""))
        .filter(Boolean),
    ),
  ];

  const employeeRows =
    employeeIds.length || emails.length
      ? await Employee.find({
          $or: [
            ...(employeeIds.length ? [{ employeeId: { $in: employeeIds } }] : []),
            ...(emails.length
              ? [
                  { officialEmail: { $in: emails } },
                  { personalEmail: { $in: emails } },
                ]
              : []),
          ],
        })
          .select({
            employeeId: 1,
            fullName: 1,
            designation: 1,
            department: 1,
            workLocationType: 1,
            officialEmail: 1,
            personalEmail: 1,
          })
          .lean()
      : [];

  const byEmployeeId = new Map(
    employeeRows.map((e) => [String(e.employeeId), e]),
  );
  const byEmail = new Map<string, (typeof employeeRows)[number]>();
  for (const e of employeeRows) {
    if (e.officialEmail) byEmail.set(String(e.officialEmail).toLowerCase(), e);
    if (e.personalEmail) byEmail.set(String(e.personalEmail).toLowerCase(), e);
  }

  const employees: OwnerEmployeesInFieldRow[] = [];

  for (const [mapKey, punches] of punchesByKey) {
    const last = punches[punches.length - 1];
    if (!last || last.punchType !== "in") continue;

    const emp =
      mapKey.startsWith("id:")
        ? byEmployeeId.get(mapKey.slice(3))
        : byEmail.get(mapKey.slice(6));

    if (!isFieldPunchIn(last, emp?.workLocationType ? String(emp.workLocationType) : null)) {
      continue;
    }

    const loc = last.location as FieldVisitLocation | undefined;
    const city = loc?.city?.trim() || loc?.address?.split(",")[0]?.trim() || "";
    const name = emp?.fullName
      ? String(emp.fullName)
      : last.userEmail
        ? String(last.userEmail)
        : mapKey.slice(3);
    const designation = emp?.designation ? String(emp.designation) : "Field";
    const role = [designation, city].filter(Boolean).join(" · ");

    employees.push({
      key: emp?.employeeId ? String(emp.employeeId) : mapKey,
      name,
      role: role || designation,
      href: emp?.employeeId ? `/hrms/employees/${encodeURIComponent(String(emp.employeeId))}` : undefined,
    });
  }

  employees.sort((a, b) => a.name.localeCompare(b.name));

  return {
    fieldCount: employees.length,
    employees: employees.slice(0, 10),
  };
}

function abbreviateRepName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  return name.trim();
}

function visitStatusLabel(status: FieldVisitStatus): string {
  const labels: Record<FieldVisitStatus, string> = {
    pending: "Pending",
    accepted: "Accepted",
    "in-progress": "In progress",
    completed: "Done",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

/** Today's field visit assignments for the owner dashboard. */
export async function getTodayFieldVisitsForOwner(): Promise<OwnerFieldVisitRow[]> {
  await connectDB();

  const { start: todayStart, end: todayEnd } = fieldVisitDayBoundsIST();

  const rows = await FieldVisitAssignment.find({
    $or: [
      { visitDate: { $gte: todayStart, $lte: todayEnd } },
      { createdAt: { $gte: todayStart, $lte: todayEnd } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return rows.map((doc) => {
    const visit = toView(doc as Record<string, unknown>);
    const customerName = visit.partyName.trim().split(/\s+/)[0] || visit.partyName;
    const location =
      visit.locationText?.split(",")[0]?.trim() ||
      visit.locationText?.trim() ||
      visit.visitType;
    const rep = abbreviateRepName(visit.assignedEmployeeName);
    return {
      key: visit.id,
      customer: `${customerName} — ${location}`,
      rep: `${rep} · ${visitStatusLabel(visit.status)}`,
      href: "/field-sales/visit-log",
    };
  });
}
