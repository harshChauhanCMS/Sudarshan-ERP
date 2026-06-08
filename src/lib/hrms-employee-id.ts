import Employee from "@/lib/models/Employee";
import { nextHrmsEmployeeId } from "@/lib/id-generators";

/** Allocate the next unused EMP-#### id (retries on collision). */
export async function allocateHrmsEmployeeId(): Promise<string> {
  const rows = await Employee.find({}, { employeeId: 1 }).lean();
  let candidate = nextHrmsEmployeeId(rows);

  for (let attempt = 0; attempt < 8; attempt++) {
    const exists = await Employee.exists({ employeeId: candidate });
    if (!exists) return candidate;
    const m = candidate.match(/^EMP-(\d+)$/i);
    const n = m ? parseInt(m[1], 10) : 3000;
    candidate = `EMP-${n + 1}`;
  }

  throw new Error("Could not allocate a unique employee ID");
}
