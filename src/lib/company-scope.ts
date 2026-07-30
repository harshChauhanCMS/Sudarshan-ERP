import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";
import { isAdminOrOwner } from "@/lib/role-utils";
import type { SessionUser } from "@/lib/session";

export type CompanyScope =
  | { restricted: false }
  | { restricted: true; companies: string[] }; // non-empty when restricted: true

/**
 * Resolves the viewer's own company affiliation, for narrowing HR/manager
 * visibility of employee-keyed data. Fail-open: owner/admin, a missing
 * employeeId, a missing Employee record, or an empty `companies` array on the
 * viewer's own record all resolve to unrestricted — `Employee.companies` is a
 * brand-new field, empty on every pre-existing record.
 */
export async function resolveCompanyScope(
  user?: Pick<SessionUser, "role" | "employeeId">,
): Promise<CompanyScope> {
  if (!user || isAdminOrOwner(user.role) || !user.employeeId) {
    return { restricted: false };
  }

  await connectDB();
  const viewerEmp = await Employee.findOne({ employeeId: user.employeeId })
    .select("companies")
    .lean();

  const companies = Array.isArray(viewerEmp?.companies)
    ? viewerEmp.companies.filter(
        (c: unknown): c is string => typeof c === "string" && c.trim().length > 0,
      )
    : [];

  if (!companies.length) return { restricted: false };
  return { restricted: true, companies };
}

/**
 * Narrows `candidateEmployeeIds` (or all employees, when omitted) to those
 * sharing at least one company with the viewer. Fail-open on the target
 * side: employees with no company tag of their own are always included.
 * Returns `null` when `companyScope.restricted` is false, meaning "no
 * narrowing" — the caller keeps its original scope/candidate set.
 */
export async function narrowEmployeeIdsByCompany(
  companyScope: CompanyScope,
  candidateEmployeeIds?: string[],
): Promise<string[] | null> {
  if (!companyScope.restricted) return null;

  await connectDB();
  const query: Record<string, unknown> = {
    $or: [
      { companies: { $exists: false } },
      { companies: { $size: 0 } },
      { companies: { $in: companyScope.companies } },
    ],
  };
  if (candidateEmployeeIds) {
    query.employeeId = {
      $in: candidateEmployeeIds.length ? candidateEmployeeIds : ["__none__"],
    };
  }

  const rows = await Employee.find(query).select("employeeId").lean();
  return rows.map((r) => String(r.employeeId));
}
