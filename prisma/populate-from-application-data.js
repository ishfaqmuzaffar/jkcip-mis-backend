// prisma/populate-from-application-data.js
// Populates 19 logframe indicator progress records from the
// Component / Scheme application data (as of June 2026).
// Run with: node prisma/populate-from-application-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const YEAR = 2025;

// ── Source figures from the report ────────────────────────────────────────────
const D = {
  total_approved:         38559,
  total_male_approved:    29614,  // C1(24260) + C2(389) + C3(4965)
  total_female_approved:   8929,  // C1(7976)  + C2(92)  + C3(861)
  comp1_approved:         32245,
  comp1_male_approved:    24260,
  comp1_female_approved:   7976,
  sc11_approved:             15,  // FPOs collectivisation
  water_mgmt_agri:         1312,  // SC1.2 water mgmt schemes approved
  water_mgmt_hort:          553,  // SC1.3 water mgmt schemes approved
  nurseries_total:  82+2+39+4+1+1+4,  // = 133 across all nursery types
  comp2_approved:           483,
  comp2_male_approved:      389,
  comp2_female_approved:     92,
  seed_capital_approved:      0,
  scaleup_approved:           0,
  sc31_approved:           5707,  // vulnerable community support
  youth_clubs_approved:     124,
};

const total_outreach = D.total_male_approved + D.total_female_approved;
const male_pct   = Math.round((D.total_male_approved   / total_outreach) * 10) / 10;
const female_pct = Math.round((D.total_female_approved / total_outreach) * 10) / 10;
const total_water = D.water_mgmt_agri + D.water_mgmt_hort;

// ── Mappings: [realCode, result, male, female, youth, remarks] ────────────────
const MAPPINGS = [
  // Outreach
  ['OR-1-M',   D.total_male_approved,   D.total_male_approved,   null, null,
   'Sum of male-approved: C1(24,260) + C2(389) + C3(4,965)'],

  ['OR-1-F',   D.total_female_approved, null, D.total_female_approved, null,
   'Sum of female-approved: C1(7,976) + C2(92) + C3(861)'],

  ['OR-1-T',   D.total_approved, D.total_male_approved, D.total_female_approved, null,
   'Total approved applications across all 3 components = total persons receiving project support'],

  ['OR-1-MP',  male_pct,   null, null, null,
   `Male share: ${D.total_male_approved}/${total_outreach}×100 = ${male_pct}%. Target 53% — currently above target`],

  ['OR-1-FP',  female_pct, null, null, null,
   `Female share: ${D.total_female_approved}/${total_outreach}×100 = ${female_pct}%. Target 47% — well below target, needs attention`],

  // Output 1.1 — FPOs
  ['OP11-FPO', D.sc11_approved, null, null, null,
   'Approved applications under SC 1.1 Upscaling Collectivisation. Midterm target: 50.'],

  // Output 2.2 — producers accessing inputs/technology
  ['OP22-113-M', D.comp1_male_approved, D.comp1_male_approved, null, null,
   'Male approved under Component 1 (Climate Smart and Market Led Production) = 24,260'],

  ['OP22-113-F', D.comp1_female_approved, null, D.comp1_female_approved, null,
   'Female approved under Component 1 = 7,976'],

  ['OP22-113-T', D.comp1_approved, D.comp1_male_approved, D.comp1_female_approved, null,
   'Total approved under Component 1 = 32,245. Midterm target: 15,150 — already exceeded.'],

  // Output 2.3 — water management
  ['OP23-WMS', total_water, null, null, null,
   `Water systems: Agri SC1.2 (${D.water_mgmt_agri}) + Hort SC1.3 (${D.water_mgmt_hort}) = ${total_water}. Midterm target: 675 — already exceeded.`],

  // Output 2.4 — nurseries
  ['OP24-NUR', D.nurseries_total, null, null, null,
   'Nurseries established: Apple(82)+Pear(2)+Walnut(39)+Stonefruits(4)+Mango(1)+Litchi(1)+Citrus(4) = 133. Midterm target: 160.'],

  // Output 3.1 — enterprises / IGAs
  ['OP31-ENT',   D.comp2_approved, null, null, null,
   'Approved under SC 2.1 Enterprise promotion = 483. Midterm target: 602.'],

  ['OP31-212-M', D.comp2_male_approved, D.comp2_male_approved, null, null,
   'Male approved under Component 2 (Agribusiness Ecosystem Development) = 389'],

  ['OP31-212-F', D.comp2_female_approved, null, D.comp2_female_approved, null,
   'Female approved under Component 2 = 92'],

  ['OP31-212-T', D.comp2_approved, D.comp2_male_approved, D.comp2_female_approved, null,
   'Total approved under Component 2 = 483. Midterm target: 602.'],

  // Output 3.3 — startups
  ['OP33-SEED',  D.seed_capital_approved, null, null, null,
   'Approved Seed capital/Challenge fund = 0 (39 total, none approved yet). Midterm target: 175.'],

  ['OP33-SCALE', D.scaleup_approved, null, null, null,
   'Approved Scale-up capital = 0 (3 total). Midterm target: 60.'],

  // Output 4.2 — vulnerable communities / youth clubs
  ['OP42-VUL',  D.sc31_approved, null, null, null,
   'Approved under SC 3.1 vulnerable community support (sheep/goat, fish, income diversification) = 5,707. Midterm target: 625 — exceeded.'],

  ['OP42-CLUB', D.youth_clubs_approved, null, null, D.youth_clubs_approved,
   'Approved youth club applications (SC 3.3 Environmental & Climate Action) = 124. Midterm target: 1,300.'],
];

async function upsertProgress(indicatorId, result, male, female, youth, remarks) {
  return prisma.indicatorYearProgress.upsert({
    where: {
      indicatorId_reportYear_district_block_village: {
        indicatorId,
        reportYear: YEAR,
        district:   null,
        block:      null,
        village:    null,
      },
    },
    update: {
      annualResult:      result,
      cumulativeResult:  result,
      maleValue:         male    ?? undefined,
      femaleValue:       female  ?? undefined,
      youthValue:        youth   ?? undefined,
      evidenceSource:    'Component/Scheme Application Data Report (June 2026)',
      remarks,
      lastReportedAt:    new Date(),
    },
    create: {
      indicatorId,
      reportYear:        YEAR,
      annualTarget:      null,
      annualResult:      result,
      cumulativeResult:  result,
      maleValue:         male    ?? undefined,
      femaleValue:       female  ?? undefined,
      youthValue:        youth   ?? undefined,
      district:          null,
      block:             null,
      village:           null,
      evidenceSource:    'Component/Scheme Application Data Report (June 2026)',
      remarks,
      lastReportedAt:    new Date(),
    },
  });
}

async function main() {
  console.log('📊 Populating 19 logframe indicators from application data\n');

  let ok = 0, skipped = 0, errors = 0;

  for (const [code, result, male, female, youth, remarks] of MAPPINGS) {
    try {
      const indicator = await prisma.indicator.findUnique({
        where: { code },
        select: { id: true, name: true, unit: true, midTarget: true },
      });

      if (!indicator) {
        console.log(`  ⚠ Not found: "${code}"`);
        skipped++;
        continue;
      }

      await upsertProgress(indicator.id, result, male, female, youth, remarks);

      const pct = indicator.midTarget
        ? ` (${Math.round((result / indicator.midTarget) * 100)}% of midterm target ${indicator.midTarget})`
        : '';
      console.log(`  ✅ ${code}: ${result}${indicator.unit ? ' '+indicator.unit : ''}${pct}`);
      console.log(`     ${indicator.name}`);
      ok++;
    } catch (e) {
      console.error(`  ❌ ${code}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n────────────────────────────────────────────────────');
  console.log(`✅ Populated: ${ok}  ⚠ Skipped: ${skipped}  ❌ Errors: ${errors}`);

  if (skipped > 0) {
    console.log('\nℹ Skipped codes were not found in the DB.');
    console.log('  This likely means those indicators use the new seed codes (outreach-ind-002 etc.)');
    console.log('  rather than the original codes (OR-1-M etc.) — check which seed was actually run.');
  }

  // Achievement summary
  console.log('\n── Achievement vs midterm targets ─────────────────');
  const summary = [
    ['OR-1-T',   'Total outreach',        D.total_approved,       150000],
    ['OR-1-MP',  'Male share (%)',         male_pct,               53],
    ['OR-1-FP',  'Female share (%)',       female_pct,             47],
    ['OP11-FPO', 'FPOs supported',         D.sc11_approved,        50],
    ['OP22-113-T','Producers w/ inputs',   D.comp1_approved,       15150],
    ['OP23-WMS', 'Water mgmt systems',     total_water,            675],
    ['OP24-NUR', 'Nurseries',              D.nurseries_total,      160],
    ['OP31-ENT', 'Enterprises',            D.comp2_approved,       602],
    ['OP42-VUL', 'Vulnerable supported',   D.sc31_approved,        625],
    ['OP42-CLUB','Youth clubs',            D.youth_clubs_approved, 1300],
  ];

  console.log('Indicator'.padEnd(30) + 'Result'.padStart(8) + 'Midterm'.padStart(10) + '% achvd'.padStart(10));
  console.log('-'.repeat(60));
  for (const [, label, val, mid] of summary) {
    const pct = mid ? Math.round((val / mid) * 100) + '%' : 'N/A';
    console.log(label.padEnd(30) + String(val).padStart(8) + String(mid).padStart(10) + pct.padStart(10));
  }
  console.log('\n⚠  Female share (23.2%) is far below the 47% target — programme attention needed');
  console.log('⚠  Youth clubs (124) are only 10% of midterm target (1,300)');
  console.log('✓  Water mgmt systems and vulnerable community support exceed midterm targets');
}

main()
  .catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
