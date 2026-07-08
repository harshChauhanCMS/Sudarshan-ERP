import type { Order, PurchaseOrder, RawMaterial, SparePart, Packaging } from "./entity-types";

const COMPANIES = [
  {
    id: "smi",
    name: "Sudarshan Minerals & Industries",
    short: "SMI",
    desc: "Industrial minerals & specialty chemicals",
    products: ["Talc", "China Clay", "Calcium Carbonate", "Dolomite", "Quartz", "Soda Ash", "Zeolite", "STPP"],
    plant: "Udaipur, Rajasthan",
    employees: 184,
    sites: 3,
    activeOrders: 47,
    mark: "indigo",
  },
  {
    id: "smic",
    name: "Sudarshan Microns",
    short: "Microns",
    desc: "Industrial packaging — FIBC, PP woven, BOPP",
    products: ["FIBC Bags", "PP Woven Bags", "PP Woven Fabrics", "BOPP Bags"],
    plant: "Ahmedabad, Gujarat",
    employees: 122,
    sites: 2,
    activeOrders: 31,
    mark: "gold",
  },
];

const RAW_MATERIALS: RawMaterial[] = [
  { code: "RM-TAL-001", name: "Talcum Powder",            grade: "Cosmetic 600 mesh",  category: "minerals",  stock: 84.5, unit: "MT", reorder: 25, value: 6258000, location: "Plant A · Bay 1",  status: "ok",     trend: 5.2 },
  { code: "RM-CC-002",  name: "Calcium Carbonate",         grade: "Coated 2µ",          category: "minerals",  stock: 12.3, unit: "MT", reorder: 30, value: 1845000, location: "Plant A · Bay 2",  status: "low",    trend: -18.4 },
  { code: "RM-DOL-003", name: "Dolomite Powder",           grade: "200 mesh",           category: "minerals",  stock: 156,  unit: "MT", reorder: 40, value: 2496000, location: "Plant A · Bay 3",  status: "ok",     trend: 2.1 },
  { code: "RM-PCC-004", name: "Precipitated Calcium Carb.",grade: "Ultra-fine 0.8µ",    category: "fillers",   stock: 7.8,  unit: "MT", reorder: 15, value: 1638000, location: "Plant B · Tank 1", status: "critical", trend: -22.1 },
  { code: "RM-CCL-005", name: "China Clay Powder",         grade: "Hydrous 350 mesh",   category: "minerals",  stock: 64.2, unit: "MT", reorder: 35, value: 3210000, location: "Plant A · Bay 4",  status: "ok",     trend: -3.2 },
  { code: "RM-QTZ-006", name: "Quartz Grains",             grade: "20-40 mesh",         category: "minerals",  stock: 218,  unit: "MT", reorder: 60, value: 4360000, location: "Yard 2",           status: "ok",     trend: 8.4 },
  { code: "CH-SDA-007", name: "Soda Ash",                  grade: "Light, dense pack",  category: "additives", stock: 22.6, unit: "MT", reorder: 25, value: 904000,  location: "Plant B · Bay 1",  status: "low",    trend: -10.4 },
  { code: "CH-ZEO-008", name: "Zeolite",                   grade: "4A detergent grade", category: "additives", stock: 41.7, unit: "MT", reorder: 20, value: 1668000, location: "Plant B · Bay 2",  status: "ok",     trend: 6.5 },
  { code: "CH-SSL-009", name: "Sodium Silicate",           grade: "Glass 1.6 ratio",    category: "additives", stock: 9.4,  unit: "L",  reorder: 12, value: 658000,  location: "Plant B · Tank 2", status: "low",    trend: -4.1 },
  { code: "CH-STP-010", name: "STPP",                      grade: "Tech 94%",           category: "additives", stock: 28.0, unit: "MT", reorder: 18, value: 1932000, location: "Plant B · Bay 3",  status: "ok",     trend: 1.3 },
];

const PACKAGING: Packaging[] = [
  { code: "PK-FIBC-25", name: "FIBC Bag · 1000 kg · 4-loop", capacity: 1000, materialType: "PP Woven", stock: 4280, unit: "pcs", reorder: 1500, status: "ok",   trend: 4.1 },
  { code: "PK-FIBC-12", name: "FIBC Bag · 500 kg · UN-rated",capacity: 500,  materialType: "PP Woven", stock: 920,  unit: "pcs", reorder: 1200, status: "low",  trend: -8.2 },
  { code: "PK-PPW-50",  name: "PP Woven Bag · 50 kg",        capacity: 50,   materialType: "PP Woven", stock: 18400,unit: "pcs", reorder: 6000, status: "ok",   trend: 2.4 },
  { code: "PK-PPW-25",  name: "PP Woven Bag · 25 kg",        capacity: 25,   materialType: "PP Woven", stock: 7240, unit: "pcs", reorder: 4000, status: "ok",   trend: 12.0 },
  { code: "PK-BOPP-20", name: "BOPP Bag · 20 kg · 4-color",  capacity: 20,   materialType: "Laminated",stock: 1980, unit: "pcs", reorder: 3000, status: "low",  trend: -3.1 },
  { code: "PK-FAB-001", name: "PP Woven Fabric · 1100 GSM",                  materialType: "PP Woven", stock: 6800, unit: "mtr", reorder: 2000, status: "ok",   trend: 1.0 },
];

const SPARE_PARTS: SparePart[] = [
  { code: "SP-BRG-001", name: "Pulverizer Bearing 6320",     vendor: "SKF India",          category: "Bearing",     stock: 12, unit: "pcs", reorder: 6,  value: 84000,   location: "Plant A · Stores · Rack 3", status: "ok",       trend: 0,    critical: true,  lastIssued: "May 12", standardRate: 7000,   criticality: "critical" },
  { code: "SP-BLT-002", name: "V-Belt B-92 (industrial)",    vendor: "Fenner India",       category: "Belt",        stock: 4,  unit: "pcs", reorder: 8,  value: 9600,    location: "Plant A · Stores · Rack 1", status: "low",      trend: -25,  critical: true,  lastIssued: "May 18", standardRate: 2400,   criticality: "critical" },
  { code: "SP-MOT-003", name: "Motor 50 HP TEFC 3-phase",    vendor: "Crompton Greaves",   category: "Motor",       stock: 2,  unit: "pcs", reorder: 2,  value: 184000,  location: "Plant A · Stores · Bay 4", status: "low",      trend: 0,    critical: true,  lastIssued: "Apr 22", standardRate: 92000,  criticality: "critical" },
  { code: "SP-SEL-004", name: "Mechanical Seal MS-45",        vendor: "John Crane India",   category: "Seal",        stock: 18, unit: "pcs", reorder: 8,  value: 32400,   location: "Plant A · Stores · Rack 2", status: "ok",       trend: 8,    critical: false, lastIssued: "May 19", standardRate: 1800 },
  { code: "SP-GBX-005", name: "Reduction Gearbox 30:1",       vendor: "Bonfiglioli",        category: "Gearbox",     stock: 1,  unit: "pcs", reorder: 1,  value: 145000,  location: "Plant B · Stores · Bay 2", status: "critical", trend: 0,    critical: true,  lastIssued: "Apr 30", standardRate: 145000, criticality: "critical" },
  { code: "SP-FLT-006", name: "Bag filter element 40µ",        vendor: "Pall India",         category: "Filter",      stock: 84, unit: "pcs", reorder: 30, value: 67200,   location: "Plant B · Stores · Rack 5", status: "ok",       trend: 4,    critical: false, lastIssued: "May 20", standardRate: 800 },
  { code: "SP-VAL-007", name: "Pneumatic ball valve 2-inch",   vendor: "Forbes Marshall",    category: "Valve",       stock: 6,  unit: "pcs", reorder: 4,  value: 36000,   location: "Plant B · Stores · Rack 3", status: "ok",       trend: 0,    critical: false, lastIssued: "May 14", standardRate: 6000 },
  { code: "SP-CHN-008", name: "Bucket elevator chain · 24mt",  vendor: "Tsubaki India",      category: "Chain",       stock: 0,  unit: "set", reorder: 1,  value: 0,       location: "—",                          status: "critical", trend: -100, critical: true,  lastIssued: "Apr 18", standardRate: 0,      criticality: "critical" },
  { code: "SP-PMP-009", name: "Slurry pump impeller MS-32",     vendor: "Kirloskar Brothers", category: "Pump",        stock: 3,  unit: "pcs", reorder: 4,  value: 54000,   location: "Plant A · Stores · Rack 4", status: "low",      trend: -12,  critical: false, lastIssued: "May 16", standardRate: 18000 },
  { code: "SP-ELC-010", name: "Contactor 100A LC1-D80",         vendor: "Schneider Electric", category: "Electrical",  stock: 14, unit: "pcs", reorder: 6,  value: 28000,   location: "Plant A · Stores · Panel",  status: "ok",       trend: 2,    critical: false, lastIssued: "May 11", standardRate: 2000 },
  { code: "SP-INS-011", name: "RTD Pt100 temperature sensor",   vendor: "Honeywell India",    category: "Instrument",  stock: 22, unit: "pcs", reorder: 10, value: 39600,   location: "Plant B · Stores · Cabinet",status: "ok",       trend: 0,    critical: false, lastIssued: "May 09", standardRate: 1800 },
  { code: "SP-LUB-012", name: "Mobil SHC Gear 220 (20L)",       vendor: "ExxonMobil Lubes",   category: "Lubricant",   stock: 8,  unit: "drum",reorder: 4,  value: 96000,   location: "Plant A · Stores · Bay 6",  status: "ok",       trend: 6,    critical: false, lastIssued: "May 17", standardRate: 12000 },
];

const SPARE_CATEGORIES = ["Bearing", "Belt", "Motor", "Seal", "Gearbox", "Filter", "Valve", "Chain", "Pump", "Electrical", "Instrument", "Lubricant"];

const VENDORS = [
  { id: "V-001", name: "Hindustan Talc Mines Pvt Ltd",   city: "Udaipur, RJ", category: "Raw Material",    poCount: 18, ytd: 24800000, rating: 4.7 },
  { id: "V-002", name: "Bharat Polychem Industries",      city: "Surat, GJ",   category: "Chemical",        poCount: 14, ytd: 18200000, rating: 4.4 },
  { id: "V-003", name: "Krishna Mineral Suppliers",       city: "Salem, TN",   category: "Raw Material",    poCount: 22, ytd: 31600000, rating: 4.8 },
  { id: "V-004", name: "Pratap Engineering Works",        city: "Pune, MH",    category: "Spare Parts",     poCount: 9,  ytd: 4800000,  rating: 4.2 },
  { id: "V-005", name: "Gujarat PP Yarns Co.",            city: "Ahmedabad, GJ",category: "Packaging",      poCount: 12, ytd: 9100000,  rating: 4.5 },
  { id: "V-006", name: "Vikas Soda Ash Trading",          city: "Mumbai, MH",  category: "Chemical",        poCount: 8,  ytd: 6200000,  rating: 4.1 },
];

const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PO-2026-0142", vendor: "Hindustan Talc Mines Pvt Ltd", items: 3, total: 1840000, date: "May 18, 2026",   status: "pending",   invoice: "awaiting" },
  { id: "PO-2026-0141", vendor: "Krishna Mineral Suppliers",    items: 2, total: 2240000, date: "May 17, 2026",   status: "approved",  invoice: "verified" },
  { id: "PO-2026-0140", vendor: "Bharat Polychem Industries",   items: 4, total: 980000,  date: "May 16, 2026",   status: "received",  invoice: "verified" },
  { id: "PO-2026-0139", vendor: "Gujarat PP Yarns Co.",         items: 1, total: 650000,  date: "May 15, 2026",   status: "received",  invoice: "mismatch" },
  { id: "PO-2026-0138", vendor: "Vikas Soda Ash Trading",       items: 2, total: 410000,  date: "May 14, 2026",   status: "received",  invoice: "verified" },
  { id: "PO-2026-0137", vendor: "Pratap Engineering Works",     items: 6, total: 215000,  date: "May 12, 2026",   status: "received",  invoice: "verified" },
];

const CUSTOMERS = [
  { id: "C-001", name: "Asian Paints Limited",   city: "Mumbai",     orders: 24, ytd: 48200000, terms: "Net 45" },
  { id: "C-002", name: "Berger Paints India Ltd",city: "Kolkata",    orders: 18, ytd: 36400000, terms: "Net 30" },
  { id: "C-003", name: "Pidilite Industries",    city: "Mumbai",     orders: 31, ytd: 62100000, terms: "Net 30" },
  { id: "C-004", name: "Nirma Limited",          city: "Ahmedabad",  orders: 28, ytd: 54800000, terms: "Net 45" },
  { id: "C-005", name: "Ultratech Cement",       city: "Mumbai",     orders: 12, ytd: 22000000, terms: "Net 60" },
  { id: "C-006", name: "JK White Cement Works",  city: "Gotan, RJ",  orders: 16, ytd: 28400000, terms: "Net 45" },
];

const ORDERS: Order[] = [
  { id: "SO-2026-0421", customer: "Asian Paints Limited",  product: "Talcum Powder · 600 mesh",    qty: "24 MT",   value: 1776000, due: "May 24",   status: "in-production",  progress: 65 },
  { id: "SO-2026-0420", customer: "Pidilite Industries",   product: "Calcium Carbonate · Coated", qty: "18 MT",    value: 1296000, due: "May 23",   status: "scheduled",       progress: 0 },
  { id: "SO-2026-0419", customer: "Berger Paints",         product: "China Clay · Hydrous",        qty: "32 MT",   value: 2080000, due: "May 22",   status: "in-production",  progress: 84 },
  { id: "SO-2026-0418", customer: "Nirma Limited",         product: "Soda Ash · Light",             qty: "40 MT",   value: 1480000, due: "May 21",   status: "dispatched",      progress: 100 },
  { id: "SO-2026-0417", customer: "Ultratech Cement",      product: "Dolomite · 200 mesh",          qty: "60 MT",   value: 720000,  due: "May 20",   status: "delivered",       progress: 100 },
  { id: "SO-2026-0416", customer: "JK White Cement Works", product: "PCC · Ultra-fine",             qty: "12 MT",   value: 1872000, due: "May 25",   status: "scheduled",       progress: 0 },
  { id: "SO-2026-0415", customer: "Asian Paints Limited",  product: "Talc · 800 mesh",              qty: "16 MT",   value: 1216000, due: "May 26",   status: "in-production",  progress: 38 },
  { id: "SO-2026-0414", customer: "Pidilite Industries",   product: "Quartz Grains · 20-40",       qty: "48 MT",   value: 960000,  due: "May 19",   status: "delivered",       progress: 100 },
  { id: "SO-2026-0413", customer: "Berger Paints",         product: "PCC · Ultra-fine",             qty: "8 MT",    value: 1248000, due: "May 23",   status: "in-production",  progress: 72 },
];

const INVOICES = [
  { id: "INV-HTM-26-0517", po: "PO-2026-0142", vendor: "Hindustan Talc Mines", invDate: "May 20, 2026", invAmt: 1844000, poAmt: 1840000, status: "mismatch", reason: "₹4,000 diff · freight" },
  { id: "INV-KMS-26-0512", po: "PO-2026-0141", vendor: "Krishna Mineral Suppliers", invDate: "May 19, 2026", invAmt: 2240000, poAmt: 2240000, status: "matched", reason: "—" },
  { id: "INV-BPI-26-0511", po: "PO-2026-0140", vendor: "Bharat Polychem", invDate: "May 18, 2026", invAmt: 980000, poAmt: 980000, status: "matched", reason: "—" },
  { id: "INV-GPY-26-0509", po: "PO-2026-0139", vendor: "Gujarat PP Yarns", invDate: "May 17, 2026", invAmt: 656500, poAmt: 650000, status: "mismatch", reason: "₹6,500 diff · GST" },
  { id: "INV-VST-26-0508", po: "PO-2026-0138", vendor: "Vikas Soda Ash", invDate: "May 16, 2026", invAmt: 410000, poAmt: 410000, status: "matched", reason: "—" },
  { id: "INV-PEW-26-0507", po: "PO-2026-0137", vendor: "Pratap Engineering", invDate: "May 14, 2026", invAmt: 218000, poAmt: 215000, status: "mismatch", reason: "₹3,000 diff · quantity" },
];

/** Demo users — default password `sudarshan123`; owner@sudarshan.com uses `Test@123` (see seed-users). */
const USERS = [
  { email: "owner@sudarshan.com", name: "Sudarshan Owner", role: "owner", employeeId: "E-OWNER" },
  { email: "rajiv@sudarshan.co.in", name: "Rajiv Mehta", role: "owner", employeeId: "E-2014" },
  { email: "priya@sudarshan.co.in", name: "Priya Sharma", role: "admin", employeeId: "EMP-3002" },
  { email: "anil@sudarshan.co.in", name: "Anil Kapoor", role: "rm", employeeId: "E-2019" },
];

const DISPATCHES = [
  { id: "DSP-1042", vehicle: "RJ-27-GH-4521", driver: "Ramesh Kumar",  customer: "Asian Paints",     route: "Udaipur → Mumbai",     loaded: "24 MT", eta: "May 22, 11:30",  progress: 68, status: "in-transit", lastUpdate: "8 min ago" },
  { id: "DSP-1041", vehicle: "GJ-18-AB-2287", driver: "Suresh Patel",  customer: "Pidilite",         route: "Ahmedabad → Mumbai",    loaded: "18 MT", eta: "May 22, 14:00",  progress: 42, status: "in-transit", lastUpdate: "12 min ago" },
  { id: "DSP-1040", vehicle: "RJ-27-CD-9912", driver: "Manoj Singh",   customer: "Berger Paints",    route: "Udaipur → Kolkata",     loaded: "32 MT", eta: "May 24, 06:00",  progress: 24, status: "in-transit", lastUpdate: "3 min ago" },
  { id: "DSP-1039", vehicle: "GJ-18-EF-7741", driver: "Hardik Joshi",  customer: "Nirma Limited",    route: "Ahmedabad → Bhavnagar", loaded: "40 MT", eta: "May 21, 18:30",  progress: 92, status: "near-delivery", lastUpdate: "2 min ago" },
  { id: "DSP-1038", vehicle: "RJ-27-GH-3340", driver: "Deepak Mehta",  customer: "Ultratech",        route: "Udaipur → Pune",        loaded: "60 MT", eta: "May 21, 22:00",  progress: 100, status: "delivered", lastUpdate: "1 hr ago" },
  { id: "DSP-1037", vehicle: "RJ-27-JK-5582", driver: "Vinod Sharma",  customer: "JK Cement",        route: "Udaipur → Gotan",       loaded: "12 MT", eta: "May 25, 09:00",  progress: 0,   status: "loading",    lastUpdate: "1 min ago" },
];

const EMPLOYEES = [
  { id: "E-2014", name: "Rajiv Mehta",      role: "Owner",                  dept: "Leadership", status: "active", since: "2014" },
  { id: "E-2018", name: "Priya Sharma",     role: "Admin",                  dept: "Operations", status: "active", since: "2018" },
  { id: "E-2019", name: "Anil Kapoor",      role: "RM Procurement",         dept: "Procurement",status: "active", since: "2019" },
  { id: "E-2020", name: "Sunita Verma",     role: "Packaging Procurement",  dept: "Procurement",status: "active", since: "2020" },
  { id: "E-2021", name: "Vikram Bhatia",    role: "Spares Procurement",     dept: "Procurement",status: "active", since: "2021" },
  { id: "E-2017", name: "Manish Joshi",     role: "Production Manager",     dept: "Production", status: "active", since: "2017" },
  { id: "E-2019b",name: "Rohan Desai",      role: "Dispatch Manager",       dept: "Logistics",  status: "active", since: "2019" },
  { id: "E-2018b",name: "Neha Iyer",        role: "HR Manager",             dept: "HR",         status: "active", since: "2018" },
  { id: "E-2022", name: "Karan Singh",      role: "Field Sales",            dept: "Sales",      status: "active", since: "2022" },
  { id: "E-2023", name: "Pooja Aggarwal",   role: "Field Sales",            dept: "Sales",      status: "active", since: "2023" },
];

const PERMISSIONS = [
  { module: "Raw Material Procurement", owner: "F", admin: "F", rm: "F", pack: "-", spare: "-", prod: "V", disp: "-", hr: "-", sales: "-" },
  { module: "Packaging Procurement",    owner: "F", admin: "F", rm: "-", pack: "F", spare: "-", prod: "V", disp: "-", hr: "-", sales: "-" },
  { module: "Spare Parts Procurement",  owner: "F", admin: "F", rm: "-", pack: "-", spare: "F", prod: "V", disp: "-", hr: "-", sales: "-" },
  { module: "Production",               owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "F", disp: "V", hr: "-", sales: "-" },
  { module: "Dispatch",                 owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "F", disp: "F", hr: "-", sales: "V" },
  { module: "Stores",                   owner: "F", admin: "F", rm: "E", pack: "E", spare: "E", prod: "F", disp: "V", hr: "-", sales: "-" },
  { module: "HR",                       owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "-", disp: "-", hr: "F", sales: "-" },
  { module: "Accounts",                 owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "V", disp: "-", hr: "V", sales: "V" },
  { module: "Field Sales",              owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "-", disp: "V", hr: "-", sales: "F" },
  { module: "Reports",                  owner: "F", admin: "F", rm: "V", pack: "V", spare: "V", prod: "F", disp: "F", hr: "V", sales: "V" },
  { module: "User Management",          owner: "F", admin: "F", rm: "-", pack: "-", spare: "-", prod: "-", disp: "-", hr: "-", sales: "-" },
];

const ROLES = [
  { key: "owner", label: "Owner" },
  { key: "admin", label: "Admin" },
  { key: "rm",    label: "RM Proc." },
  { key: "pack",  label: "Pack. Proc." },
  { key: "spare", label: "Spares Proc." },
  { key: "prod",  label: "Prod. Mgr" },
  { key: "disp",  label: "Dispatch Mgr" },
  { key: "hr",    label: "HR" },
  { key: "sales", label: "Field Sales" },
];

const NOTIFS = [
  { id: 1, type: "alert",   text: "PCC Ultra-fine stock below critical (7.8 MT / 15 MT reorder)", time: "12 min", target: "/inventory/raw-material" },
  { id: 2, type: "info",    text: "PO-2026-0142 awaiting invoice verification",                    time: "1 hr",   target: "/procurement" },
  { id: 3, type: "success", text: "DSP-1039 nearing delivery — Nirma Ltd, Bhavnagar",              time: "2 hr",   target: "/dispatch" },
  { id: 4, type: "alert",   text: "BOPP Bag 20kg stock low, 2 active orders affected",             time: "3 hr",   target: "/inventory/packaging" },
  { id: 5, type: "info",    text: "Field visit log: Karan Singh checked-in at Asian Paints HO",    time: "4 hr",   target: "/field-sales/activity-dashboard" },
];

const REVENUE_DATA = [
  { month: "Nov", smi: 42, smic: 28 },
  { month: "Dec", smi: 48, smic: 31 },
  { month: "Jan", smi: 51, smic: 34 },
  { month: "Feb", smi: 46, smic: 33 },
  { month: "Mar", smi: 58, smic: 38 },
  { month: "Apr", smi: 64, smic: 42 },
  { month: "May", smi: 71, smic: 47 },
];

const PRODUCTION_DATA = [
  { day: "Mon", planned: 84,  actual: 88 },
  { day: "Tue", planned: 90,  actual: 82 },
  { day: "Wed", planned: 86,  actual: 91 },
  { day: "Thu", planned: 92,  actual: 95 },
  { day: "Fri", planned: 88,  actual: 84 },
  { day: "Sat", planned: 78,  actual: 76 },
  { day: "Sun", planned: 60,  actual: 64 },
];

const FIELD_VISITS = [
  { id: "FV-2201", rep: "Karan Singh",    customer: "Asian Paints HO",       city: "Mumbai",  status: "completed",   ts: "10:45 AM", outcome: "Quoted 2 lots" },
  { id: "FV-2200", rep: "Pooja Aggarwal", customer: "Pidilite Andheri",      city: "Mumbai",  status: "in-progress", ts: "11:20 AM", outcome: "—" },
  { id: "FV-2199", rep: "Karan Singh",    customer: "Berger Paints East",    city: "Kolkata", status: "completed",   ts: "Yesterday",outcome: "Sample dispatch" },
  { id: "FV-2198", rep: "Pooja Aggarwal", customer: "Nirma Ltd Vatva",       city: "Ahmedabad",status: "completed",  ts: "Yesterday",outcome: "Order confirmed" },
  { id: "FV-2197", rep: "Karan Singh",    customer: "JK White Plant",        city: "Gotan",   status: "completed",   ts: "2 days",   outcome: "Tech demo" },
];

const ATTENDANCE_TODAY = {
  present: 268,
  total: 306,
  late: 12,
  leave: 18,
  absent: 8,
  onField: 4,
};

export const SEED_DATA = {
  COMPANIES,
  RAW_MATERIALS,
  PACKAGING,
  SPARE_PARTS,
  SPARE_CATEGORIES,
  VENDORS,
  PURCHASE_ORDERS,
  CUSTOMERS,
  ORDERS,
  INVOICES,
  DISPATCHES,
  EMPLOYEES,
  PERMISSIONS,
  ROLES,
  NOTIFS,
  REVENUE_DATA,
  PRODUCTION_DATA,
  FIELD_VISITS,
  ATTENDANCE_TODAY,
  USERS,
};

export type ErpData = typeof SEED_DATA;
