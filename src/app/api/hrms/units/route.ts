import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/lib/models/Employee";

export async function GET() {
  try {
    await connectDB();
    // Get unique location units that are not null or empty
    const units = await Employee.distinct("locationUnit", { locationUnit: { $nin: [null, ""] } });
    // Sort alphabetically
    units.sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ success: true, data: units });
  } catch (error: any) {
    console.error("GET Units API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
