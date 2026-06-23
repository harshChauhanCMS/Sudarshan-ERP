import type { FieldVisitView } from "@/lib/field-visit-types";
import { companyLabel, formatVisitTime12h } from "@/lib/field-visit-form";

export function visitStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "PENDING",
    accepted: "ACCEPTED",
    "in-progress": "IN PROGRESS",
    completed: "COMPLETED",
    cancelled: "NOT DONE",
  };
  return map[status] ?? status.replace(/-/g, " ").toUpperCase();
}

export function visitStatusBadgeClass(status: string): string {
  if (status === "completed") return "done";
  if (status === "cancelled") return "cancelled";
  if (status === "pending") return "delayed";
  return "field";
}

export function formatVisitDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatVisitDurationMinutes(mins: number | null): string {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Minutes from accept → complete/cancel. */
export function getVisitAcceptToCloseMinutes(visit: FieldVisitView): number | null {
  if (!visit.acceptedAt) return null;
  const endIso = visit.completedAt ?? visit.cancelledAt;
  if (!endIso) return null;
  const start = new Date(visit.acceptedAt).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, Math.round((end - start) / 60000));
}

export function getVisitClosingRemark(visit: FieldVisitView): string | null {
  if (visit.status === "completed" && visit.notes?.trim()) {
    return visit.notes.trim();
  }
  if (visit.status === "cancelled" && visit.cancelReason?.trim()) {
    return visit.cancelReason.trim();
  }
  return null;
}

export function googleMapsHref(visit: FieldVisitView): string | null {
  if (visit.visitLocation?.lat != null && visit.visitLocation?.lng != null) {
    const { lat, lng } = visit.visitLocation;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  const text = visit.locationText?.trim();
  if (text) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  }
  return null;
}

export { companyLabel, formatVisitTime12h };
