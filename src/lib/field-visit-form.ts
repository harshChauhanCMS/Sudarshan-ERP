import type { CreateFieldVisitPayload, FieldVisitType } from "@/lib/field-visit-types";
import { FIELD_VISIT_TYPES } from "@/lib/field-visit-types";

export const FIELD_VISIT_COMPANY_OPTIONS = [
  { value: "smi", label: "Sudarshan Minerals & Industries (Udaipur)" },
  { value: "smic", label: "Sudarshan Microns" },
] as const;

export function companyLabel(company: string): string {
  return (
    FIELD_VISIT_COMPANY_OPTIONS.find((o) => o.value === company)?.label ??
    company
  );
}

export function defaultFieldVisitForm(): CreateFieldVisitPayload {
  return {
    assignedEmployeeId: "",
    company: "smi",
    visitDate: new Date().toISOString().slice(0, 10),
    visitType: "Customer",
    partyName: "",
    locationText: "",
    startTime: "09:00",
    returnTime: "14:00",
    purpose: "",
    notes: "",
  };
}

export function formatVisitTime12h(time24: string): string {
  const [hRaw, mRaw] = time24.split(":");
  const h = parseInt(hRaw ?? "0", 10);
  const m = mRaw ?? "00";
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${period}`;
}

export type FieldVisitFormState = CreateFieldVisitPayload;

export { FIELD_VISIT_TYPES };
export type { FieldVisitType };
