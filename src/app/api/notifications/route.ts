import { connectDB } from "@/lib/db";
import Notification from "@/lib/models/Notification";
import { ok, fail } from "@/lib/api-response";
import { getSession } from "@/lib/session";

function formatRelativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user?.email) {
    return fail("Unauthorized", 401);
  }

  try {
    await connectDB();
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") ?? "30"), 1),
      200
    );
    const filter = url.searchParams.get("filter")?.trim().toLowerCase();
    const email = session.user.email.trim().toLowerCase();

    const query: Record<string, unknown> = { recipientEmail: email };
    if (filter === "unread") query.read = false;
    if (filter === "read") query.read = true;

    const [rows, unreadCount, totalCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipientEmail: email, read: false }),
      Notification.countDocuments({ recipientEmail: email }),
    ]);

    const notifications = rows.map((n) => ({
      id: String(n._id),
      type: n.type,
      category: n.category,
      text: n.message,
      time: formatRelativeTime(new Date(n.createdAt)),
      target: n.target || "/hrms/attendance",
      read: Boolean(n.read),
      employeeId: n.employeeId,
      punchType: n.punchType,
      createdAt: n.createdAt,
    }));

    return ok({ notifications, unreadCount, totalCount });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load notifications", 500);
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user?.email) {
    return fail("Unauthorized", 401);
  }

  try {
    await connectDB();
    const body = await request.json().catch(() => ({}));
    const email = session.user.email.trim().toLowerCase();

    if (body.all === true) {
      await Notification.updateMany(
        { recipientEmail: email, read: false },
        { $set: { read: true } }
      );
      return ok({ markedAll: true });
    }

    const ids = Array.isArray(body.ids)
      ? body.ids.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    if (!ids.length) return fail("Provide ids array or all: true", 400);

    await Notification.updateMany(
      { recipientEmail: email, _id: { $in: ids } },
      { $set: { read: true } }
    );

    return ok({ marked: ids.length });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to update notifications", 500);
  }
}
