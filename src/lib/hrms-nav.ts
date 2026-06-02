/** Shared back-navigation targets for HRMS pages */
export const HRMS_BACK = {
  dashboard: { backLabel: "Dashboard", backHref: "/dashboard/master" },
  reports: { backLabel: "All reports", backHref: "/hrms/reports" },
  employees: { backLabel: "Employees", backHref: "/hrms/employees" },
  salary: { backLabel: "Salary hub", backHref: "/hrms/salary" },
  leave: { backLabel: "Leave hub", backHref: "/hrms/leave/record" },
} as const;
