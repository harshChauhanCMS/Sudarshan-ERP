import { ok } from "@/lib/api-response";
import { requireSession } from "@/lib/api-auth";
import { isDbConfigured } from "@/lib/mongodb";
import { useMockDataEnabled } from "@/lib/bootstrap-meta";

/** GET /api/system/status — lightweight signal for the demo-data/no-DB banner. No business data. */
export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  return ok({
    dbConfigured: isDbConfigured(),
    mockDataEnabled: useMockDataEnabled(),
  });
}
