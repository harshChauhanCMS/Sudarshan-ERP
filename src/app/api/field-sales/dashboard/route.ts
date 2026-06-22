import { ok, fail } from "@/lib/api-response";
import { requireSession } from "@/lib/api-auth";
import { getFieldActivityDashboard } from "@/lib/field-visit-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;

  try {
    const data = await getFieldActivityDashboard();
    return ok(data);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load field dashboard", 500);
  }
}
