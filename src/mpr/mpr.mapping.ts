// mpr.mapping.ts
// Maps MPR activity codes (column B of Google Sheets) to MIS indicator codes.
// Each entry: activityCode → { indicatorCode, valueColumn, unit, notes }
//
// Google Sheet column structure (verified against the actual CSV export):
//   Col A  = (blank spacer column)
//   Col B  = Code
//   Col C  = Component / activity
//   Col D  = Unit
//   Col E  = Unit cost
//   Col F  = Total project target (Physical)
//   Col G  = Total project target (Financial Rs'000)
//   Col H  = AWPB Physical target
//   Col I  = AWPB Financial
//   Col J  = 2025-26 Phy. Target
//   Col K  = 2025-26 Fin. Target
//   Col L  = Physical Achievement Completed  ← THIS IS THE VALUE WE IMPORT
//   Col M  = % Phy. Achievement

export interface MprMapping {
  indicatorCode: string;   // matches Indicator.code in DB
  label: string;           // human readable for logs
  unit?: string;
  cumulative?: boolean;    // true = value is cumulative (most MPR figures)
}

// Primary mapping: activityCode → MprMapping
// Activity codes from the DAJ sheet (visible in screenshot) + known codes from other depts
export const MPR_ACTIVITY_MAP: Record<string, MprMapping> = {

  // ── P02 — Agri Niche Crop Promotion ─────────────────────────────────────────

  // Saffron
  'P02AN11-S': { indicatorCode: 'OP22-SAFF',  label: 'Saffron area expansion', unit: 'Kanal', cumulative: true },

  // Aromatic Rice
  'P02AN11':   { indicatorCode: 'OP22-RICE-B', label: 'Aromatic Rice (Basmati)', unit: 'Kanal', cumulative: true },
  'P02AN11-M': { indicatorCode: 'OP22-RICE-M', label: 'Aromatic Rice (Mushkbudji)', unit: 'Kanal', cumulative: true },

  // Vegetables
  'P02AN13':   { indicatorCode: 'OP22-VEG',   label: 'H.Vegetables area expansion', unit: 'Kanal', cumulative: true },

  // Aromatic and Medicinal Plants
  'P02AN14':   { indicatorCode: 'OP22-AMP',   label: 'Aromatic & Medicinal Plants', unit: 'Kanal', cumulative: true },

  // Shallot
  'P02AN15':   { indicatorCode: 'OP22-SHLT',  label: 'Area expansion – Shallot', unit: 'Kanal', cumulative: true },

  // Kalazeera
  'P02AN16':   { indicatorCode: 'OP22-KZR',   label: 'Kalazeera', unit: 'Kanal', cumulative: true },

  // Bhaderwah Rajma
  'P02AN17':   { indicatorCode: 'OP22-RAJM',  label: 'Bhaderwah Rajma', unit: 'Kanal', cumulative: true },

  // Hill Garlic
  'P02AN18':   { indicatorCode: 'OP22-GARL',  label: 'Hill Garlic', unit: 'Kanal', cumulative: true },

  // Water Management Systems (Agri)
  'P02AN20':   { indicatorCode: 'OP23-WMS',   label: 'Water management systems', unit: 'No.', cumulative: true },

  // Protected Cultivation
  'P02AN21':   { indicatorCode: 'OP22-PROT',  label: 'Protected Cultivation', unit: 'No.', cumulative: true },

  // Seed Village Promotion
  'P02AN08':   { indicatorCode: 'OP11-FPO',   label: 'Seed village promotion (FPO)', unit: 'Per FPO', cumulative: true },

  // GAP Training (DAJ — Agri Jammu / DAK — Agri Kashmir)
  'P02AN09':   { indicatorCode: 'OP21-GAP',   label: 'Farmers trained in GAP', unit: 'Persons', cumulative: true },
  'P02GAP':    { indicatorCode: 'OP21-GAP',   label: 'GAP training', unit: 'Persons', cumulative: true },

  // ── P03 — Horticulture Crop Support ─────────────────────────────────────────

  // Nurseries by crop type
  'P03NUR-AP': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Apple', unit: 'No.', cumulative: true },
  'P03NUR-PE': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Pear', unit: 'No.', cumulative: true },
  'P03NUR-WL': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Walnut', unit: 'No.', cumulative: true },
  'P03NUR-SF': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Stonefruits', unit: 'No.', cumulative: true },
  'P03NUR-MG': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Mango', unit: 'No.', cumulative: true },
  'P03NUR-LT': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Litchi', unit: 'No.', cumulative: true },
  'P03NUR-CI': { indicatorCode: 'OP24-NUR',   label: 'Nursery – Citrus', unit: 'No.', cumulative: true },

  // Water management (Horticulture)
  'P03WMS':    { indicatorCode: 'OP23-WMS',   label: 'Water management – Hort', unit: 'No.', cumulative: true },
  'P03HOR20':  { indicatorCode: 'OP23-WMS',   label: 'Water management – Hort', unit: 'No.', cumulative: true },

  // Crop management — Apple
  'P03HOR-AP': { indicatorCode: 'OP22-APPL',  label: 'Crop management – Apple', unit: 'No.', cumulative: true },
  'P03HOR-WL': { indicatorCode: 'OP22-WALN',  label: 'Crop management – Walnut', unit: 'No.', cumulative: true },
  'P03HOR-MG': { indicatorCode: 'OP22-MANG',  label: 'Crop management – Mango', unit: 'No.', cumulative: true },
  'P03HOR-CI': { indicatorCode: 'OP22-CITR',  label: 'Crop management – Citrus', unit: 'No.', cumulative: true },
  'P03HOR-SF': { indicatorCode: 'OP22-STON',  label: 'Crop management – Stonefruits', unit: 'No.', cumulative: true },

  // ── P04 — FPO / Collectivisation ─────────────────────────────────────────────

  'P04FPO':    { indicatorCode: 'OP11-FPO',   label: 'FPOs supported', unit: 'No.', cumulative: true },
  'P04UC01':   { indicatorCode: 'OP11-FPO',   label: 'New FPOs established', unit: 'No.', cumulative: true },
  'P04UC02':   { indicatorCode: 'OP11-FPO',   label: 'FPOs strengthened', unit: 'No.', cumulative: true },
  'P04UC-M':   { indicatorCode: 'OP11-214',   label: 'PO members (total)', unit: 'Persons', cumulative: true },

  // GAP training — SKUAST codes
  'P04GAP':    { indicatorCode: 'OP21-GAP',   label: 'GAP training (SKUAST)', unit: 'Persons', cumulative: true },

  // ── P05 — Enterprise / Agribusiness ──────────────────────────────────────────

  // Enterprises supported
  'P05ENT':    { indicatorCode: 'OP31-ENT',   label: 'Enterprises supported', unit: 'No.', cumulative: true },
  'P05ENT11':  { indicatorCode: 'OP31-ENT',   label: 'Mushroom production (enterprise)', unit: 'Per FPO', cumulative: true },
  'P05ENT12':  { indicatorCode: 'OP31-ENT',   label: 'Honey production (enterprise)', unit: 'Per FPO', cumulative: true },
  'P05ENT-CA': { indicatorCode: 'OP31-ENT',   label: 'CA store', unit: 'No.', cumulative: true },
  'P05ENT-PH': { indicatorCode: 'OP31-ENT',   label: 'Packhouse (enterprise)', unit: 'No.', cumulative: true },
  'P05ENT-AG': { indicatorCode: 'OP31-ENT',   label: 'Agro-tourism', unit: 'No.', cumulative: true },

  // Training in IGAs / business management
  'P05TR-M':   { indicatorCode: 'OP31-212-M', label: 'Male trained in IGA/business', unit: 'Persons', cumulative: true },
  'P05TR-F':   { indicatorCode: 'OP31-212-F', label: 'Female trained in IGA/business', unit: 'Persons', cumulative: true },
  'P05TR-T':   { indicatorCode: 'OP31-212-T', label: 'Total trained in IGA/business', unit: 'Persons', cumulative: true },

  // ── P06 — Market Promotion ────────────────────────────────────────────────────

  'P06MSP':    { indicatorCode: 'OP32-MSP',   label: 'Market support programmes conducted', unit: 'No.', cumulative: true },
  'P06BSM':    { indicatorCode: 'OP32-BSM',   label: 'Buyer-seller meets conducted', unit: 'No.', cumulative: true },
  'P06MPS04':  { indicatorCode: 'OP32-MSP',   label: 'Market promotion – quality lab', unit: 'Ls', cumulative: false },

  // ── P07 — Incubation / Startups ──────────────────────────────────────────────

  'P07SEED':   { indicatorCode: 'OP33-SEED',  label: 'Seed capital funded', unit: 'No.', cumulative: true },
  'P07SCALE':  { indicatorCode: 'OP33-SCALE', label: 'Scale-up capital funded', unit: 'No.', cumulative: true },

  // ── P08 — Vulnerable Communities ─────────────────────────────────────────────

  'P08SH':     { indicatorCode: 'OP42-VUL',   label: 'Sheep/goat units supported', unit: 'No.', cumulative: true },
  'P08FISH':   { indicatorCode: 'OP42-VUL',   label: 'Fish icebox/vending support', unit: 'No.', cumulative: true },
  'P08AHDK':   { indicatorCode: 'OP42-VUL',   label: 'Animal husbandry support', unit: 'No.', cumulative: true },
  'P08INC':    { indicatorCode: 'OP42-VUL',   label: 'Income diversification support', unit: 'No.', cumulative: true },

  // ── P09 — Pastoralists ────────────────────────────────────────────────────────

  'P09WOOL':   { indicatorCode: 'OP41-WOOL',  label: 'Wool sector support', unit: 'No.', cumulative: true },
  'P09WPP':    { indicatorCode: 'OP41-WOOL',  label: 'Wool processing with partners', unit: 'No.', cumulative: true },
  'P09GOAT':   { indicatorCode: 'OP41-WOOL',  label: 'Goat breed improvement', unit: 'No.', cumulative: true },

  // ── P10 — Youth Clubs ────────────────────────────────────────────────────────

  'P10YC':     { indicatorCode: 'OP42-CLUB',  label: 'Youth clubs supported', unit: 'No.', cumulative: true },
  'P10YCEA':   { indicatorCode: 'OP42-CLUB',  label: 'Youth clubs – env. action', unit: 'No.', cumulative: true },

  // ── P11 — Policy / PMU ───────────────────────────────────────────────────────

  'P11STU':    { indicatorCode: 'OP51-STU',   label: 'Policy studies conducted', unit: 'No.', cumulative: true },
  'P11WRK':    { indicatorCode: 'OP51-WRK',   label: 'Policy workshops conducted', unit: 'No.', cumulative: true },
  'P11STAFF':  { indicatorCode: 'OP52-STAFF', label: 'Staff positions filled', unit: '%', cumulative: false },
};

// Department configuration: sheet ID + tabs available
export interface DepartmentConfig {
  name: string;
  sheetId: string;
  tabs: string[];  // available month tabs
  valueColumnIndex: number; // 0-based index of "Physical Achievement Completed" column
  codeColumnIndex: number;  // 0-based index of activity code column
}

export const DEPARTMENTS: Record<string, DepartmentConfig> = {
  DAJ: {
    name: 'Department of Agriculture Jammu',
    sheetId: '1jc57mX6eHPNXHEz7xvdEHzAinAISL0PCwUJqbFAKnFk',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025', 'Sep - 2025', 'Aug - 2025', 'Jul - 2025', 'Jun - 2025',
           'Mar - 2025', 'Feb - 2025', 'Jan - 2025', 'Dec - 2024'],
    valueColumnIndex: 11,  // Column L
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  DAK: {
    name: 'Department of Agriculture Kashmir',
    sheetId: '1bJnVqpBfW8YPn2BOPWJ-KIjT2nct6kwtZm0ov-GeTQo',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025', 'Sep - 2025', 'Aug - 2025', 'Jul - 2025', 'Jun - 2025',
           'Mar - 2025', 'Feb - 2025', 'Jan - 2025', 'Dec - 2024'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  DHJ: {
    name: 'Department of Horticulture Jammu',
    sheetId: '1emy5CFCGoKRdLhEYFO3eas1jNYL_RrbP8XqV8hpEjSw',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025', 'Sep - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  DHK: {
    name: 'Department of Horticulture Kashmir',
    sheetId: '117MbwvtQAponMy1N08XjgV7K4zOgehmbEZrIGkKn4ac',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025', 'Sep - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  SHDK: {
    name: 'Department of Sheep Husbandry Kashmir',
    sheetId: '1A41Vzysit86H00TQ-bj6mqBS4CXHMucEmepQBEmbfzo',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  SHDJ: {
    name: 'Department of Sheep Husbandry Jammu',
    sheetId: '1UUC_Y-gVT-8bdWcy2gfG4PtFylmSn4fFzWdHwHUl3lM',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  HPM: {
    name: 'Horticulture Planning & Marketing',
    sheetId: '1KcvHCyTpjJYH5vbcYyoPY2FoRnRs7_8bJVMDVMwdGa4',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  FJK: {
    name: 'Fisheries J&K',
    sheetId: '1ZltwN5RJeTgvcZv9BQGawx4kuckcGSnILY4yNpjhTm0',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  AHDK: {
    name: 'Animal Husbandry Kashmir',
    sheetId: '10sm_cZ2xXBTmseyWd8MfuEiThEepBq2RsfIaCTlEQSw',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  AHDJ: {
    name: 'Animal Husbandry Jammu',
    sheetId: '1IupdX5EPGo9tYo2U7-Mxn4-bp0zoyIUuNCIciQVBfwU',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  SKUASTK: {
    name: 'SKUAST Kashmir',
    sheetId: '1L7ypfqIKsU45CAGa15jTyWxteNbkyUcy5L0nZe7My_o',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  SKUASTJ: {
    name: 'SKUAST Jammu',
    sheetId: '1PLjQE5QdiZcSAj-eH153MLP34duqt_UQSPeLJrFOyEE',
    tabs: ['May - 2026', 'Apr - 2026', 'Mar - 2026', 'Feb - 2026', 'Jan - 2026', 'Dec - 2025',
           'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
  PMU: {
    name: 'Project Management Unit',
    sheetId: '1DHhgnTSAyLvhVsCs9-iu9CJh6eLCKzVc8jVWPxcOd8o',
    // PMU's sheet switched to the incompatible HADP report format starting Jan 2026 — Dec 2025
    // is the last old-format month available; do not extend further without a new mapping.
    tabs: ['Dec - 2025', 'Nov - 2025', 'Oct - 2025'],
    valueColumnIndex: 11,
    codeColumnIndex: 1, // col A is a blank spacer column; the activity code is in col B
  },
};

// Derive report year and month from tab name e.g. "Nov - 2025" → "2025-11"
export function tabToReportMonth(tabName: string): string {
  const MONTHS: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const [mon, , yr] = tabName.split(' ');
  return `${yr}-${MONTHS[mon] ?? '00'}`;
}

// Derive financial year from report month e.g. "2025-11" → 2025 (Apr25–Mar26)
export function reportMonthToFinYear(reportMonth: string): number {
  const [yr, mo] = reportMonth.split('-').map(Number);
  return mo >= 4 ? yr : yr - 1;
}
