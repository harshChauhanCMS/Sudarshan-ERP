export type SkillLevel = "Skilled" | "Semi" | "Unskilled";
export type PayMode = "Bank" | "Cash";
export type PayStatus = "Pending" | "Approved";

export type DailyWageWorker = {
  id: string;
  code: string;
  name: string;
  skill: SkillLevel;
  trade: string;
  contractor: string;
  unit: string;
  dailyRate: number;
  days: number;
  otHours: number;
  advance: number;
  esi: number;
  mode: PayMode;
  status: PayStatus;
};

export type TradeSummaryRow = {
  trade: string;
  count: number;
  avgRate: number;
  mandays: number;
  wages: number;
};

export type DisbursementRow = {
  mode: string;
  labourers: number;
  amount: number;
  status: string;
  statusTone: "warning" | "info" | "success";
};

const WORKERS: DailyWageWorker[] = [
  { id: "w1", code: "LAB-3012", name: "Subhash Chandra", skill: "Skilled", trade: "Mason", contractor: "Direct", unit: "Plant A", dailyRate: 540, days: 26, otHours: 8, advance: 500, esi: 0, mode: "Bank", status: "Approved" },
  { id: "w2", code: "LAB-3018", name: "Ram Singh", skill: "Skilled", trade: "Welder", contractor: "Direct", unit: "Plant A", dailyRate: 580, days: 26, otHours: 6, advance: 0, esi: 0, mode: "Bank", status: "Approved" },
  { id: "w3", code: "LAB-3033", name: "Hari Prasad", skill: "Semi", trade: "Helper", contractor: "Shree Ram Manpower", unit: "Plant B", dailyRate: 420, days: 26, otHours: 4, advance: 300, esi: 0, mode: "Bank", status: "Pending" },
  { id: "w4", code: "LAB-3041", name: "Pappu Lal", skill: "Unskilled", trade: "Sweeper", contractor: "Direct", unit: "Plant A", dailyRate: 350, days: 26, otHours: 2, advance: 0, esi: 0, mode: "Cash", status: "Approved" },
  { id: "w5", code: "LAB-3047", name: "Sohan Gameti", skill: "Semi", trade: "Painter", contractor: "Shree Ram Manpower", unit: "Plant B", dailyRate: 450, days: 24, otHours: 3, advance: 0, esi: 0, mode: "Bank", status: "Pending" },
  { id: "w6", code: "LAB-3024", name: "Hari Lal", skill: "Semi", trade: "Helper", contractor: "Maruti Labour Services", unit: "Warehouse", dailyRate: 420, days: 26, otHours: 5, advance: 200, esi: 0, mode: "Bank", status: "Approved" },
  { id: "w7", code: "LAB-3026", name: "Kailash Meena", skill: "Unskilled", trade: "Loader", contractor: "Maruti Labour Services", unit: "Warehouse", dailyRate: 380, days: 22, otHours: 3, advance: 0, esi: 0, mode: "Cash", status: "Approved" },
  { id: "w8", code: "LAB-3031", name: "Suresh Kumar", skill: "Skilled", trade: "Fitter", contractor: "Direct", unit: "Plant A", dailyRate: 560, days: 26, otHours: 7, advance: 0, esi: 0, mode: "Bank", status: "Approved" },
  { id: "w9", code: "LAB-3052", name: "Mohan Lal", skill: "Unskilled", trade: "Helper", contractor: "Shree Ram Manpower", unit: "Plant B", dailyRate: 360, days: 25, otHours: 2, advance: 150, esi: 0, mode: "Cash", status: "Pending" },
  { id: "w10", code: "LAB-3058", name: "Dinesh Gameti", skill: "Semi", trade: "Loader", contractor: "Maruti Labour Services", unit: "Warehouse", dailyRate: 400, days: 26, otHours: 4, advance: 0, esi: 0, mode: "Bank", status: "Approved" },
];

export const PAY_PERIODS = [
  { value: "2025-03", label: "Mar 2025 (full month)" },
  { value: "2026-03", label: "Mar 2026 (full month)" },
  { value: "2026-02", label: "Feb 2026 (full month)" },
];

export const PAY_FREQUENCIES = ["Monthly", "Weekly", "Fortnightly"];
export const UNITS = ["All", "Plant A", "Plant B", "Warehouse"];
export const SKILL_FILTERS = ["All", "Skilled", "Semi", "Unskilled"];
export const CONTRACTORS = ["All", "Direct", "Shree Ram Manpower", "Maruti Labour Services"];
export const DISBURSEMENT_FILTERS = ["All", "Bank", "Cash", "Pending approval"];

export function hourlyRate(dailyRate: number) {
  return dailyRate / 8;
}

export function calcWorkerPay(w: DailyWageWorker) {
  const wages = w.dailyRate * w.days;
  const otAmount = Math.round(hourlyRate(w.dailyRate) * w.otHours * 2);
  const gross = wages + otAmount;
  const pf = Math.round(Math.min(w.dailyRate * 0.12 * w.days, 1800));
  const deductions = pf + w.esi + w.advance;
  const net = gross - deductions;
  return { wages, otAmount, gross, pf, deductions, net };
}

export function getDailyWageWorkers(): DailyWageWorker[] {
  return WORKERS;
}

export function filterWorkers(
  workers: DailyWageWorker[],
  filters: {
    unit: string;
    skill: string;
    contractor: string;
    disbursement: string;
  }
) {
  return workers.filter((w) => {
    if (filters.unit !== "All" && w.unit !== filters.unit) return false;
    if (filters.skill !== "All" && w.skill !== filters.skill) return false;
    if (filters.contractor !== "All" && w.contractor !== filters.contractor) return false;
    if (filters.disbursement === "Bank" && w.mode !== "Bank") return false;
    if (filters.disbursement === "Cash" && w.mode !== "Cash") return false;
    if (filters.disbursement === "Pending approval" && w.status !== "Pending") return false;
    return true;
  });
}

export function getDailyWageKpi(workers: DailyWageWorker[]) {
  const skilled = workers.filter((w) => w.skill === "Skilled").length;
  const semi = workers.filter((w) => w.skill === "Semi").length;
  const unskilled = workers.filter((w) => w.skill === "Unskilled").length;
  const mandays = workers.reduce((s, w) => s + w.days, 0);
  const otHours = workers.reduce((s, w) => s + w.otHours, 0);
  let totalWages = 0;
  let totalOt = 0;
  let totalNet = 0;
  for (const w of workers) {
    const p = calcWorkerPay(w);
    totalWages += p.wages;
    totalOt += p.otAmount;
    totalNet += p.net;
  }
  const absentees = workers.filter((w) => w.days < 26).length;
  return {
    headcount: workers.length,
    skilled,
    semi,
    unskilled,
    mandays,
    avgDays: workers.length ? Math.round((mandays / workers.length) * 10) / 10 : 0,
    absentees,
    otHours,
    avgOt: workers.length ? Math.round((otHours / workers.length) * 10) / 10 : 0,
    totalWages,
    totalOt,
    totalPayout: totalWages + totalOt,
    totalNet,
  };
}

export function getTradeSummary(workers: DailyWageWorker[]): TradeSummaryRow[] {
  const map = new Map<string, { count: number; rates: number[]; mandays: number; wages: number }>();
  for (const w of workers) {
    const p = calcWorkerPay(w);
    const cur = map.get(w.trade) ?? { count: 0, rates: [], mandays: 0, wages: 0 };
    cur.count++;
    cur.rates.push(w.dailyRate);
    cur.mandays += w.days;
    cur.wages += p.wages;
    map.set(w.trade, cur);
  }
  return Array.from(map.entries())
    .map(([trade, cur]) => ({
      trade,
      count: cur.count,
      avgRate: Math.round(cur.rates.reduce((a, b) => a + b, 0) / cur.rates.length),
      mandays: cur.mandays,
      wages: cur.wages,
    }))
    .sort((a, b) => b.wages - a.wages || a.trade.localeCompare(b.trade));
}

export function getDisbursementSummary(workers: DailyWageWorker[]): DisbursementRow[] {
  const bank = workers.filter((w) => w.mode === "Bank");
  const cash = workers.filter((w) => w.mode === "Cash");
  const sumNet = (list: DailyWageWorker[]) =>
    list.reduce((s, w) => s + calcWorkerPay(w).net, 0);
  return [
    { mode: "Bank transfer", labourers: bank.length, amount: sumNet(bank), status: "To process", statusTone: "warning" },
    { mode: "Cash (counter)", labourers: cash.length, amount: sumNet(cash), status: "Cash arranged", statusTone: "info" },
  ];
}

export function getContractorSplit(workers: DailyWageWorker[]) {
  const map = new Map<string, number>();
  for (const w of workers) {
    const net = calcWorkerPay(w).net;
    map.set(w.contractor, (map.get(w.contractor) ?? 0) + net);
  }
  return Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
}

export function formatInr(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatLakhs(n: number) {
  const l = n / 100000;
  return `₹${l.toFixed(2)} L`;
}

export function getSampleWorker(workers: DailyWageWorker[]) {
  if (!workers.length) return undefined;
  return [...workers].sort((a, b) => b.days - a.days || b.dailyRate - a.dailyRate)[0];
}
