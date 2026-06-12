# Sudarshan ERP — HRMS Module Guide

A simple guide to how the **Human Resource Management System (HRMS)** works in Sudarshan ERP.  
Written for managers, HR staff, and team leads — **no coding knowledge needed**.

---

## What is HRMS?

HRMS is the **People** section of Sudarshan ERP. It helps you manage:

- Employee records  
- Leave requests and approvals  
- Attendance tracking and reports  
- Monthly salary and payroll  
- Company holidays  
- HR notifications  

You open it from the left sidebar under **People**.

---

## Important: Punch In / Punch Out (Mobile App Only)

| Where | Punch in / Punch out? |
|-------|------------------------|
| **Sudarshan mobile app (APK)** | **Yes** — this is how staff record attendance |
| **Web ERP (browser)** | **No** — there is no attendance punch page on the website |

**What this means in practice:**

- Employees use the **mobile app** to punch in when they arrive and punch out when they leave.
- The app uses **GPS location** at the time of punch (required).
- HR and managers **view** attendance on the web — in employee lists and reports — but they do **not** punch in/out from the browser.
- Biometric machines (if connected) can also send punch data into the system.

If someone cannot punch from the app, they should contact HR. HR can see punches in reports; they cannot replace the app punch from the web screen (that page was removed on purpose).

---

## Who Can Use What?

Access depends on **role** and **permissions** set in User Management.

| Role | In short |
|------|----------|
| **Admin / Owner** | Full access — employees, leave, salary, payroll, all reports, holidays |
| **HR** | Full HR and payroll; can add/edit employees; cannot see other HR staff’s private records |
| **Manager** | Own team only — approve leave, view team attendance and reports; **no** salary, payroll, or holiday setup |
| **Staff (Employee)** | Self-service if given access — mainly **Apply leave** and view own data; needs login linked to employee profile |

**Manager team rule:** A manager only sees employees whose **Reporting Manager** field points to them.

---

## HRMS Menu (Sidebar)

### HR Management
| Menu item | What you do here |
|-----------|------------------|
| **Employees** | List all staff, search, filter, see today’s status, add or open profiles |
| **Salary** | Hub for monthly payroll, bulk sheet, and daily-wage payroll |

### Leave & Policy
| Menu item | What you do here |
|-----------|------------------|
| **Leave record** | History of all leave requests (filtered by role) |
| **Apply leave** | Submit your own leave request |
| **Leave approval** | Approve or reject pending requests (HR / Manager) |
| **Leave admin** | Manage company **holiday calendar** |

### Reports
| Menu item | What you do here |
|-----------|------------------|
| **Attendance Overview** | Company-wide attendance summary and trends |
| **Employee Report** | Per-person summary — absent, late, short hours, overtime |
| **Daily Attendance** | Day-by-day punch in, punch out, hours worked |
| **Field Attendance** | Office vs field (outdoor) work days |
| **Late Coming / Early Going** | Discipline report for late arrivals and early exits |
| **Payroll** | Status of recent salary cycles (draft → approved → paid) |

**Notifications** appear in the **bell icon** at the top of the screen (not in the sidebar). They alert HR and managers when someone punches in or out from the mobile app.

---

## 1. Employees

### Employee list (`/hrms/employees`)
- See all employees (or your team, if you are a manager).
- Columns include department, shift, unit, and **today’s status** (Present, Late, On leave, Absent, etc.).
- Export list to spreadsheet where allowed.

### Add employee (`/hrms/employees/add`)
- HR / Admin creates a new profile: personal details, job details, shift, salary structure, documents.
- Can create a **login** for the employee (email + password).
- The login must match the employee’s **official email** or **employee ID** so leave and mobile app work correctly.

### Employee profile (`/hrms/employees/[id]`)
- View and edit one person’s full record.
- Managers can view team members; only HR/Admin can edit most fields.

---

## 2. Leave — Full Flow

### Step 1: Employee applies leave
**Screen:** Apply leave  

1. Employee opens **Apply leave**.
2. System shows their name, employee ID, and **leave balance** (how many days left per type).
3. Employee chooses:
   - **Leave type:** PL (paid/earned), CL (casual), SL (sick), LWP (unpaid)
   - **From date** and **To date**
   - **Duration:** full day or half day (first/last day options)
   - **Reason** (required)
   - **Contact while away** (optional phone number)
4. Employee clicks **Submit**.
5. Request status becomes **Pending**.

**Rules when applying:**
- Reason must be filled in (minimum length).
- End date cannot be before start date.
- For paid leave (PL, CL, SL), system checks **remaining balance**. If not enough days left, submit is blocked.
- Unpaid leave (LWP) does not use balance.

### Step 2: Approver reviews
**Screen:** Leave approval  

Who can approve: **HR, Admin, Owner**, or the employee’s **Manager** (team only).

Actions:
- **Approve** → status becomes **Approved**; employee may get an email.
- **Reject** → must give a reason; employee may get an email.
- **Bulk approve / reject** — for many rows at once.
- **Rollback** — only for already **Approved** leave; sends it back to **Pending** (needs a reason).

There is **one approval step** in the current system (no separate HOD step on screen).

### Step 3: Leave appears in records
**Screen:** Leave record  

Everyone with access can search history by employee, year, leave type, and status.

### Leave types and typical yearly limits (defaults)

| Type | Name | Typical quota |
|------|------|----------------|
| PL | Earned / Privilege leave | 15 days (permanent staff) |
| CL | Casual leave | 12 days |
| SL | Sick leave | 12 days |
| LWP | Leave without pay | No limit (unpaid) |

HR can adjust policies in the system; the above are starting defaults.

### Apply leave for someone else
Only **Admin, Owner, and HR** can apply on behalf of another employee. Managers cannot.

---

## 3. Holidays

**Screen:** Leave admin (same as holiday calendar)

- Add **national**, **regional**, or **optional** holidays.
- Filter by year.
- Export holiday list to PDF.
- Holidays are used when planning leave and payroll working days.

---

## 4. Attendance — How It Works

### Recording attendance (mobile app)

1. Employee opens the **Sudarshan mobile app** and logs in.
2. On the **Home** tab, they choose **Office** or **Field** work site.
3. **Punch in** when starting work.
4. **Punch out** when finishing work.
5. App sends **time + GPS location** to the server.

**System rules:**
- Only **one open punch-in** per day — must punch out before punching in again.
- Cannot punch out if they never punched in that day.
- If employee is **more than 4 hours late** after shift start, punch-in may be **blocked** and they are treated as absent for the day — they must contact HR.
- **Field** punches are marked so reports can separate office vs field work.

### Who is notified?
When someone punches in or out, notifications go to:
- Admin / Owner / HR  
- That employee’s **Reporting Manager**  

(The employee who punched does not get a self-notification for their own punch.)

### Viewing attendance (web)
Attendance is **not punched on the web**. It is **viewed** here:

| Where | What you see |
|-------|----------------|
| Employee list | Today’s status per person |
| Attendance Overview report | Company KPIs and trends |
| Daily Attendance report | In/out times per day |
| Employee Report | Monthly summary per person |
| Field Attendance report | Office vs field days |
| Late / Early report | Late and early-going patterns |

Managers see **their team only**. HR and Admin see broader data (with HR privacy rules for other HR staff).

---

## 5. Salary & Payroll

### Monthly salary (most permanent staff)
**Path:** Salary hub → Monthly salary  

**Flow:**

```
Generate payroll  →  Review draft sheets  →  Approve  →  Mark paid (disbursed)
```

1. **Generate** — for a chosen month. System uses:
   - Employee salary structure (basic, HRA, etc.)
   - **Attendance** from punches  
   - **Approved leave** (paid vs unpaid)  
   - Working days (Sundays usually excluded)

2. **Draft** — sheets created for review.

3. **Approve** — HR/Admin approves selected or all sheets.

4. **Disbursed** — marks salary as paid (when finance completes payment).

5. **Export** — download CSV for bank or records.

**Deductions logic (simplified):**
- Absent days (no punch, no paid leave) reduce pay.
- Unpaid leave days reduce pay.
- PF, ESI, and overtime rules apply per company policy and employee settings.

### Other payroll screens
| Screen | Used for |
|--------|----------|
| **Bulk payroll sheet** | Wide register with bank and statutory columns — view/export |
| **Daily wage payroll** | Workers paid per day (not monthly CTC) |
| **Payroll dashboard** | Last 6 months — status of each cycle |

Only **Admin, Owner, and HR** (with payroll permission) can generate and approve salary. Managers and staff cannot open these pages.

---

## 6. Reports — Quick Guide

All reports support filters such as **date range**, **department**, **shift**, and **unit** (where relevant). Most allow **CSV export**.

| Report | Best for |
|--------|----------|
| **Attendance Overview** | Leadership view — how is attendance overall? |
| **Employee Report** | One row per employee — absent, late, OT summary |
| **Daily Attendance** | Audit a specific day or month — who came when? |
| **Field Attendance** | Who worked from field vs office? |
| **Late / Early** | Discipline and repeat late-comers |

**Tip:** Use **Daily Attendance** when HR asks “show me everyone’s in/out for last Tuesday.” Use **Employee Report** for month-end review per person.

---

## 7. Notifications

- Open the **bell** at the top of the ERP.
- Typical messages: “Priya Sharma punched in at 9:02 AM (Mobile)”.
- Clicking a notification may open the employee profile or an attendance report.
- Each user sees **their own** notification list.

---

## 8. Common Scenarios (FAQ)

### “I applied leave on the app / web but balance didn’t change”
Balance preview shows **remaining if this request is approved**. Days are fully counted when leave is **approved** (and pending requests count when you try to apply more).

### “Employee can’t punch in on the app”
Check:
- Location permission allowed on phone  
- They are not already punched in today  
- They are not blocked for being **4+ hours late**  
- Login is linked to correct employee profile  

### “Manager can’t see an employee”
Check **Reporting Manager** on the employee profile matches that manager.

### “Apply leave says no employee profile”
HR must link the user’s login email to the employee’s **official email** or **employee ID**.

### “Where do I punch in on the website?”
You don’t. Use the **mobile app only**. Web is for HR data entry, leave, salary, and reports.

---

## 9. One-Page Flow Summary

```
EMPLOYEE DAY
  Mobile app: Punch in (GPS) → Work → Punch out (GPS)
       ↓
  HR/Manager: See status in Employees list & Reports
       ↓
  If leave needed: Apply leave → Manager/HR approves → Record updated
       ↓
  Month end: HR generates salary using attendance + approved leave → Approve → Pay
```

---

## 10. Screens Removed (Don’t Look For These)

| Old web page | Status |
|--------------|--------|
| `/hrms/attendance` | **Removed** — use mobile app for punch |
| `/hrms/attendance/my` | **Removed** |

Attendance **APIs and mobile app** still work. Only the **web punch screen** was removed.

---

*Document version: June 2025 — matches Sudarshan ERP HRMS as implemented in the web app and Sudarshan mobile app.*
