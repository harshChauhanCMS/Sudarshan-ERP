import { ok, fail } from "@/lib/api-response";
import { getUserFromRequest } from "@/lib/api-request-auth";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return fail("Unauthorized", 401);
  return ok({ user });
}
