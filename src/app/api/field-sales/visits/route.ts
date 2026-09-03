import { ok, fail } from "@/lib/api-response";
import { isAdminOrOwner } from "@/lib/api-auth";
import { getUserFromRequest } from "@/lib/api-request-auth";
import {
  createFieldVisit,
  createSelfFieldVisit,
  listFieldVisits,
} from "@/lib/field-visit-service";
import type {
  CreateFieldVisitPayload,
  CreateSelfFieldVisitPayload,
  FieldVisitType,
} from "@/lib/field-visit-types";
import { FIELD_VISIT_TYPES } from "@/lib/field-visit-types";

export const dynamic = "force-dynamic";

const VISIT_TYPES = new Set<FieldVisitType>(FIELD_VISIT_TYPES);

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  const url = new URL(request.url);
  const params = url.searchParams;
  const status = params.get("status")?.trim();
  const visitType = params.get("visitType")?.trim();
  const company = params.get("company")?.trim();
  const employeeId = params.get("employeeId")?.trim();
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  const limitParam = Number(params.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 100;

  try {
    const isPrivileged = isAdminOrOwner(user.role);
    const visits = await listFieldVisits({
      status: status || undefined,
      visitType: visitType || undefined,
      company: company || undefined,
      from: from || undefined,
      to: to || undefined,
      employeeId: isPrivileged
        ? employeeId || undefined
        : user.employeeId || undefined,
      email: !isPrivileged ? user.email : undefined,
      limit,
    });
    return ok({
      visits,
      canCreate: isPrivileged,
      canCreateSelf: !isPrivileged && Boolean(user.employeeId),
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load visits", 500);
  }
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);

  const body = (await request.json().catch(() => null)) as
    | (CreateFieldVisitPayload & Partial<CreateSelfFieldVisitPayload>)
    | null;
  if (!body?.visitDate?.trim()) return fail("visitDate is required", 400);
  if (!body.partyName?.trim()) return fail("partyName is required", 400);
  if (!body.visitType || !VISIT_TYPES.has(body.visitType)) return fail("Invalid visitType", 400);

  const isPrivileged = isAdminOrOwner(user.role);

  try {
    if (isPrivileged) {
      if (!body.assignedEmployeeId?.trim()) return fail("assignedEmployeeId is required", 400);
      const visit = await createFieldVisit(body as CreateFieldVisitPayload, {
        email: user.email,
        name: user.name,
      });
      return ok(visit, 201);
    }

    if (!user.employeeId) {
      return fail("Your account is not linked to an employee profile", 403);
    }

    const { assignedEmployeeId: _ignored, ...selfPayload } = body;
    const visit = await createSelfFieldVisit(selfPayload as CreateSelfFieldVisitPayload, {
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
    });
    return ok(visit, 201);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to create visit", 400);
  }
}
