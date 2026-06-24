export type DriverFormInput = {
  name: string;
  email: string;
  mobile: string;
  vehicleNumber: string;
  vehicleCategory: string;
};

/** Strip digits — names must not contain numbers. */
export function sanitizeDriverName(value: string): string {
  return value.replace(/\d/g, "");
}

/** Keep digits only, max 10. */
export function sanitizeDriverMobile(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/** Force uppercase for vehicle registration. */
export function sanitizeVehicleNumber(value: string): string {
  return value.toUpperCase();
}

export function validateDriverForm(values: DriverFormInput): string | null {
  const name = values.name.trim();
  const email = values.email.trim();
  const mobile = values.mobile.trim();
  const vehicleNumber = values.vehicleNumber.trim();
  const vehicleCategory = values.vehicleCategory.trim();

  if (!name) return "Name is required";
  if (/\d/.test(name)) return "Name cannot contain numbers";
  if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
    return "Name can only contain letters, spaces, and . ' -";
  }

  if (!email) return "Email is required";
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) return "Invalid email address";

  if (!mobile) return "Mobile number is required";
  if (!/^\d{10}$/.test(mobile)) return "Mobile number must be exactly 10 digits";

  if (!vehicleNumber) return "Vehicle number is required";

  if (!vehicleCategory) return "Vehicle category is required";

  return null;
}

export function normalizeDriverPayload(values: DriverFormInput) {
  return {
    name: sanitizeDriverName(values.name).trim(),
    email: values.email.trim().toLowerCase(),
    mobile: sanitizeDriverMobile(values.mobile),
    vehicleNumber: sanitizeVehicleNumber(values.vehicleNumber).trim(),
    vehicleCategory: values.vehicleCategory.trim(),
  };
}
