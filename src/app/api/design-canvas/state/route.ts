import { connectDB, isDbConfigured } from "@/lib/mongodb";
import { DesignCanvasState } from "@/models/DesignCanvasState";
import { ok, fail } from "@/lib/api-response";
import { requireAdminOrOwner, requireSession } from "@/lib/api-auth";
import { promises as fs } from "fs";
import path from "path";

const STATE_PATH = path.join(process.cwd(), ".design-canvas.state.json");

async function readFileState() {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { sections: {} };
  }
}

export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;
  const adminErr = requireAdminOrOwner(user!);
  if (adminErr) return adminErr;

  try {
    if (isDbConfigured()) {
      await connectDB();
      const doc = await DesignCanvasState.findOne({ key: "default" }).lean();
      return ok(doc?.sections ? { sections: doc.sections } : { sections: {} });
    }
    return ok(await readFileState());
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to load state", 500);
  }
}

export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;
  const adminErr = requireAdminOrOwner(user!);
  if (adminErr) return adminErr;

  const body = await request.json();
  try {
    if (isDbConfigured()) {
      await connectDB();
      await DesignCanvasState.findOneAndUpdate(
        { key: "default" },
        { sections: body.sections ?? body },
        { upsert: true, new: true }
      );
      return ok({ saved: true });
    }
    await fs.writeFile(STATE_PATH, JSON.stringify(body, null, 2), "utf8");
    return ok({ saved: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to save state", 500);
  }
}
