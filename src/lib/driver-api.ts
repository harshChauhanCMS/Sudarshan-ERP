export type DriverRecord = {
  _id: string;
  name: string;
  email: string;
  mobile: string;
  vehicleNumber: string;
  vehicleCategory: string;
  status: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
};

export type CreateDriverPayload = {
  name: string;
  email: string;
  mobile: string;
  vehicleNumber: string;
  vehicleCategory: string;
};

export async function fetchDrivers(): Promise<DriverRecord[]> {
  const res = await fetch("/api/dispatch/drivers", { cache: "no-store" });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (!res.ok) throw new Error(json.error ?? "Failed to load drivers");
  return Array.isArray(json.data) ? json.data : [];
}

export async function createDriver(payload: CreateDriverPayload): Promise<DriverRecord> {
  const res = await fetch("/api/dispatch/drivers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (!res.ok) throw new Error(json.error ?? "Failed to save driver");
  const driver = json.data?.driver ?? json.data;
  if (!driver) throw new Error("Driver saved but response was empty");
  return driver as DriverRecord;
}
