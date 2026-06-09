// prisma/populate-from-application-data.js
//
// Populates 19 logframe indicator progress records from the
// Component / Scheme application data (as of June 2026).
//
// DATA SOURCE: Component-wise beneficiary application report
// REPORT YEAR: 2025 (cumulative results as of the report date)
//
// WHAT THIS SCRIPT DOES:
//   For each of the 19 mappable indicators, it upserts an
//   IndicatorYearProgress row for reportYear=2025 with:
//     - annualResult  = the value derived from the report
//     - cumulativeResult = same value (all figures are cumulative)
//     - evidenceSource = description of what it was derived from
//     - remarks = the mapping logic for audit trail
//
// Run with: node prisma/populate-from-application-data.js
// Safe to run multiple times (upsert).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const REPORT_YEAR = 2025;

// ── Source data extracted from the report ─────────────────────────────────────
const D = {
  // Overall
  total_approved:      38559,
  total_male_approved: 29614,  // 24260 (C1) + 389 (C2) + 4965 (C3)
  total_female_approved: 8929, // 7976 (C1) + 92 (C2) + 861 (C3)

  // Component 1 — Climate Smart and Market Led Production
  comp1_approved:        32245,
  comp1_male_approved:   24260,
  comp1_female_approved: 7976,

  // SC 1.1 — Upscaling Collectivisation (FPO support)
  sc11_approved: 15,

  // SC 1.2 — Agri-niche crop promotion (water management)
  water_mgmt_agri_approved: 1312,

  // SC 1.3 — Horticulture crop support (nurseries + water mgmt)
  nursery_apple_approved:       82,
  nursery_pear_approved:         2,
  nursery_walnut_approved:      39,
  nursery_stonefruits_approved:  4,
  nursery_mango_approved:        1,
  nursery_litchi_approved:       1,
  nursery_citrus_approved:       4,
  water_mgmt_hort_approved:    553,

  // Component 2 — Agribusiness Ecosystem Development
  comp2_approved:        483,
  comp2_male_approved:   389,
  comp2_female_approved: 92,

  // SC 2.2 — Seed capital / Startups
  seed_capital_approved: 0,   // 0 approved so far
  scaleup_approved:      0,   // 0 approved so far

  // Component 3 — Support to Vulnerable Communities
  sc31_approved: 5707,  // SC 3.1 vulnerable community support

  // SC 3.3 — Youth Clubs
  youth_clubs_approved: 124,
};

// ── Derived values ────────────────────────────────────────────────────────────
const total_outreach = D.total_male_approved + D.total_female_approved; // 38543
const total_nurseries =
  D.nursery_apple_approved + D.nursery_pear_approved +
  D.nursery_walnut_approved + D.nursery_stonefruits_approved +
  D.nursery_mango_approved + D.nursery_litchi_approved +
  D.nursery_citrus_approved; // 133
const total_water_mgmt = D.water_mgmt_agri_approved + D.water_mgmt_hort_approved; // 1865
const male_pct  = Math.round((D.total_male_approved   / total_outreach) * 10) / 10; // 76.8
const female_pct = Math.round((D.total_female_approved / total_outreach) * 10) / 10; // 23.2

// ── Indicator → value mapping ─────────────────────────────────────────────────
//
// Each entry: [indicatorCode, annualResult, maleValue, femaleValue, youthValue, remarks]
//
const MAPPINGS = [
  // ── Outreach ────────────────────────────────────────────────────────────────
  [
    'outreach-ind-002',
    D.total_male_approved, D.total_male_approved, null, null,
    'Sum of male-approved beneficiaries across all 3 components: Component 1 (24,260) + Component 2 (389) + Component 3 (4,965)',
  ],
  [
    'outreach-ind-003',
    D.total_female_approved, null, D.total_female_approved, null,
    'Sum of female-approved beneficiaries across all 3 components: Component 1 (7,976) + Component 2 (92) + Component 3 (861)',
  ],
  [
    'outreach-ind-006',
    D.total_approved, D.total_male_approved, D.total_female_approved, null,
    'Total approved applications across all components = total persons receiving project support (38,559)',
  ],
  [
    'outreach-ind-007',
    male_pct, null, null, null,
    `Male share: ${D.total_male_approved} / ${total_outreach} × 100 = ${male_pct}%. Target: 53%`,
  ],
  [
    'outreach-ind-008',
    female_pct, null, null, null,
    `Female share: ${D.total_female_approved} / ${total_outreach} × 100 = ${female_pct}%. Target: 47%. Note: current female share (${female_pct}%) is below target — action may be needed.`,
  ],

  // ── Output 1.1 — FPO collectivisation ───────────────────────────────────────
  [
    'output-1-1-ind-054',
    D.sc11_approved, null, null, null,
    'Approved applications under SC 1.1 Upscaling Collectivisation = 15 FPOs supported (from 206 total, 131 reverted). Midterm target: 50.',
  ],

  // ── Output 2.2 — Rural producers accessing inputs/technology ─────────────────
  [
    'output-2-2-ind-068',
    D.comp1_male_approved, D.comp1_male_approved, null, null,
    'Male approved beneficiaries under Component 1 (Climate Smart and Market Led Production) = 24,260',
  ],
  [
    'output-2-2-ind-069',
    D.comp1_female_approved, null, D.comp1_female_approved, null,
    'Female approved beneficiaries under Component 1 = 7,976',
  ],
  [
    'output-2-2-ind-071',
    D.comp1_approved, D.comp1_male_approved, D.comp1_female_approved, null,
    'Total approved under Component 1 = 32,245 (of 50,927 total). Midterm target: 15,150.',
  ],

  // ── Output 2.3 — Water management systems ────────────────────────────────────
  [
    'output-2-3-ind-075',
    total_water_mgmt, null, null, null,
    `Water management systems established: ${D.water_mgmt_agri_approved} (Agri/SC 1.2 creation of water management systems) + ${D.water_mgmt_hort_approved} (Horticulture/SC 1.3 water management) = ${total_water_mgmt}. Midterm target: 675.`,
  ],

  // ── Output 2.4 — Nurseries ───────────────────────────────────────────────────
  [
    'output-2-4-ind-077',
    total_nurseries, null, null, null,
    `Nurseries established: Apple (${D.nursery_apple_approved}) + Pear (${D.nursery_pear_approved}) + Walnut (${D.nursery_walnut_approved}) + Stonefruits (${D.nursery_stonefruits_approved}) + Mango (${D.nursery_mango_approved}) + Litchi (${D.nursery_litchi_approved}) + Citrus (${D.nursery_citrus_approved}) = ${total_nurseries}. Midterm target: 160.`,
  ],

  // ── Output 3.1 — Enterprise promotion ────────────────────────────────────────
  [
    'output-3-1-ind-087',
    D.comp2_approved, null, null, null,
    'Approved applications under SC 2.1 Enterprise promotion support = 483. Midterm target: 602.',
  ],
  [
    'output-3-1-ind-089',
    D.comp2_male_approved, D.comp2_male_approved, null, null,
    'Male approved under Component 2 (Agribusiness Ecosystem Development) = 389',
  ],
  [
    'output-3-1-ind-090',
    D.comp2_female_approved, null, D.comp2_female_approved, null,
    'Female approved under Component 2 = 92',
  ],
  [
    'output-3-1-ind-092',
    D.comp2_approved, D.comp2_male_approved, D.comp2_female_approved, null,
    'Total approved under Component 2 = 483. Midterm target: 602.',
  ],

  // ── Output 3.3 — Startups ─────────────────────────────────────────────────────
  [
    'output-3-3-ind-098',
    D.seed_capital_approved, null, null, null,
    'Approved Seed capital / Challenge fund applications = 0 (39 total, all pending or reverted). No startups funded yet.',
  ],
  [
    'output-3-3-ind-100',
    D.scaleup_approved, null, null, null,
    'Approved Scale-up capital applications = 0 (3 total). No scale-up funds disbursed yet.',
  ],

  // ── Output 4.2 — Vulnerable community support ────────────────────────────────
  [
    'output-4-2-ind-110',
    D.sc31_approved, null, null, null,
    'Approved applications under SC 3.1 Support to other vulnerable communities (sheep/goat, fish icebox, fish vending, income diversification) = 5,707. Midterm target: 625.',
  ],
  [
    'output-4-2-ind-112',
    D.youth_clubs_approved, null, null, D.youth_clubs_approved,
    'Approved youth club applications (SC 3.3 Environmental & Climate Action Activities) = 124. Midterm target: 1,300.',
  ],
];

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📊 Populating logframe indicator progress from application data\n');
  console.log(`   Report year: ${REPORT_YEAR}`);
  console.log(`   Indicators to populate: ${MAPPINGS.length}\n`);

  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const [code, result, male, female, youth, remarks] of MAPPINGS) {
    try {
      // Look up indicator by code
      const indicator = await prisma.indicator.findUnique({
        where: { code },
        select: { id: true, name: true, unit: true },
      });

      if (!indicator) {
        console.log(`  ⚠ Skipped: "${code}" — not found in DB`);
        skipped++;
        continue;
      }

      // Upsert the progress row
      await prisma.indicatorYearProgress.upsert({
        where: {
          indicatorId_reportYear_district_block_village: {
            indicatorId: indicator.id,
            reportYear: REPORT_YEAR,
            district: null,
            block: null,
            village: null,
          },
        },
        update: {
          annualResult:      result,
          cumulativeResult:  result,
          maleValue:         male   ?? undefined,
          femaleValue:       female ?? undefined,
          youthValue:        youth  ?? undefined,
          evidenceSource:    'Component/Scheme Application Data Report (June 2026)',
          remarks,
          lastReportedAt:    new Date(),
        },
        create: {
          indicatorId:      indicator.id,
          reportYear:       REPORT_YEAR,
          annualTarget:     null,
          annualResult:     result,
          cumulativeResult: result,
          maleValue:        male   ?? undefined,
          femaleValue:      female ?? undefined,
          youthValue:       youth  ?? undefined,
          district:         null,
          block:            null,
          village:          null,
          evidenceSource:   'Component/Scheme Application Data Report (June 2026)',
          remarks,
          lastReportedAt:   new Date(),
        },
      });

      const pct = indicator.unit === '%' ? '' : '';
      console.log(`  ✅ ${code}`);
      console.log(`     ${indicator.name}`);
      console.log(`     Value: ${result}${indicator.unit ? ' ' + indicator.unit : ''}`);
      success++;

    } catch (e) {
      console.error(`  ❌ Error on ${code}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────');
  console.log(`✅ Populated: ${success}`);
  if (skipped) console.log(`⚠  Skipped (code not in DB): ${skipped}`);
  if (errors)  console.log(`❌ Errors: ${errors}`);
  console.log();

  // Summary of what each indicator now shows vs target
  console.log('── Achievement vs midterm target ────────────────────\n');
  const summaryData = [
    ['outreach-ind-006', 'Total outreach',        38559, 150000],
    ['outreach-ind-007', 'Male share (%)',          76.8,    53],
    ['outreach-ind-008', 'Female share (%)',        23.2,    47],
    ['output-1-1-ind-054','FPOs supported',           15,    50],
    ['output-2-2-ind-071','Producers w/ inputs',   32245, 15150],
    ['output-2-3-ind-075','Water mgmt systems',     1865,   675],
    ['output-2-4-ind-077','Nurseries',               133,   160],
    ['output-3-1-ind-087','Enterprises',             483,   602],
    ['output-4-2-ind-110','Vulnerable supported',   5707,   625],
    ['output-4-2-ind-112','Youth clubs',             124,  1300],
  ];

  console.log(`${'Indicator':<35} ${'Result':>8} ${'Mid-target':>12}  ${'% of target':>12}`);
  console.log('-'.repeat(75));
  for (const [code, label, val, mid] of summaryData) {
    const pct = mid ? `${Math.round((val / mid) * 100)}%` : 'N/A';
    const flag = mid && val >= mid ? ' ✓' : '';
    console.log(`${label:<35} ${val.toString().padStart(8)} ${mid.toString().padStart(12)}  ${(pct + flag).padStart(12)}`);
  }

  console.log('\n── Notes ────────────────────────────────────────────');
  console.log('• Water management (1865) is 276% of midterm target (675) — significant overachievement');
  console.log('• Total outreach (38,559) is 26% of midterm target (150,000)');
  console.log('• Female share (23.2%) is below the 47% target — needs attention');
  console.log('• Youth clubs (124) is only 10% of midterm target (1,300)');
  console.log('• Startup funding (seed + scale-up): 0 approved — no progress yet');
}

main()
  .catch((e) => { console.error('\n❌ Fatal error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
