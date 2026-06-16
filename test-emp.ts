import mongoose from "mongoose";
import Employee from "./src/lib/models/Employee";
import { User } from "./src/models/User";
import { pickEmployeeLoginEmail } from "./src/lib/hrms-employee-welcome";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/erp");
  const employee = await Employee.findOne({ employeeId: "EMP-3016" }).lean();
  console.log("Employee:", employee ? {
    id: employee.employeeId,
    officialEmail: employee.officialEmail,
    personalEmail: employee.personalEmail
  } : null);

  if (employee) {
    const loginEmail = pickEmployeeLoginEmail(employee as any);
    console.log("Picked login email:", loginEmail);
    const user = await User.findOne({
      $or: [
        { employeeId: "EMP-3016" },
        ...(loginEmail ? [{ email: loginEmail }] : []),
      ],
    }).lean();
    console.log("User:", user ? {
      email: user.email,
      requiresPasswordReset: user.requiresPasswordReset,
      passwordResetDeadline: user.passwordResetDeadline
    } : null);
  }
  process.exit(0);
}
main();
