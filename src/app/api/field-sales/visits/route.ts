import { ok, fail } from "@/lib/api-response";
import { isAdminOrOwner } from "@/lib/api-auth";
import { getUserFromRequest } from "@/lib/api-request-auth";
import {
  createFieldVisit,
  listFieldVisits,
} from "@/lib/field-visit-service";
import type { CreateFieldVisitPayload, FieldVisitType } from "@/lib/field-visit-types";
import { FIELD_VISIT_TYPES } from "@/lib/field-visit-types";

export const dynamic = "force-dynamic";

const VISIT_TYPES = new Set<FieldVisitType>(FIELD_VISIT_TYPES);

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim();

  try {
    const isPrivileged = isAdminOrOwner(user.role);
    const visits = await listFieldVisits({
      status: status || undefined,
      employeeId: !isPrivileged && user.employeeId ? user.employeeId : undefined,
      email: !isPrivileged ? user.email : undefined,
      limit: 100,
    });
    return ok({ visits, canCreate: isPrivileged });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load visits", 500);
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  if (!isAdminOrOwner(user.role)) return fail("Only owner or admin can create visits", 403);

  const body = (await request.json().catch(() => null)) as CreateFieldVisitPayload | null;
  if (!body?.assignedEmployeeId?.trim()) return fail("assignedEmployeeId is required", 400);
  if (!body.visitDate?.trim()) return fail("visitDate is required", 400);
  if (!body.partyName?.trim()) return fail("partyName is required", 400);
  if (!body.visitType || !VISIT_TYPES.has(body.visitType)) return fail("Invalid visitType", 400);

  try {
    const visit = await createFieldVisit(body, {
      email: user.email,
      name: user.name,
    });
    return ok(visit, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create visit", 400);
  }
}
