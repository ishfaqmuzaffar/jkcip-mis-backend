// prisma/seed-missing-26.js
// Adds the 26 indicators missing from the live DB to reach the full 130.
// These are the group/header indicators and disaggregated breakdowns that
// exist in the official JKCIP Excel logframe but were skipped in the original seed.
// Safe to run multiple times — uses upsert by code.
// Run with: node prisma/seed-missing-26.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ind(nodeCode, data) {
  const node = await prisma.logframeNode.findUnique({ where: { code: nodeCode } });
  if (!node) {
    console.log(`  ⚠ Node "${nodeCode}" not found — skipping ${data.code}`);
    return;
  }
  await prisma.indicator.upsert({
    where: { code: data.code },
    update: { name: data.name, unit: data.unit ?? null },
    create: {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      unit: data.unit ?? null,
      baseline: data.baseline ?? null,
      midTarget: data.midTarget ?? null,
      endTarget: data.endTarget ?? null,
      frequency: data.frequency ?? 'ANNUAL',
      source: data.source ?? 'M&E data (Results Framework)',
      responsibility: data.responsibility ?? 'PMU / External agency',
      active: true,
      supportsGenderBreakdown: data.gender ?? false,
      supportsYouthBreakdown: data.youth ?? false,
      supportsIndigenousBreakdown: data.indigenous ?? false,
      supportsHouseholdBreakdown: data.household ?? false,
      supportsBlockBreakdown: false,
      logframeNodeId: node.id,
    },
  });
  console.log(`  ✅ ${data.code}: ${data.name}`);
}

async function main() {
  console.log('🌱 Adding 26 missing indicators to reach full logframe of 130\n');

  // ── Outreach — 3 missing group headers ──────────────────────────────────────
  console.log('Outreach (3 missing):');
  await ind('OUTREACH', {
    code: 'OR-HDR-1',
    name: 'Persons reached by project-supported activities',
    description: 'IFAD Core Indicator 1 — total outreach group header',
    frequency: 'ANNUAL',
    source: 'M&E data (Results Framework)',
    responsibility: 'M&E and KM Manager',
  });
  await ind('OUTREACH', {
    code: 'OR-HDR-1B',
    name: 'Estimated total number of household members (1b)',
    description: 'Corresponding total number of household members',
    unit: 'Persons',
    frequency: 'ANNUAL',
    source: 'M&E data (Results Framework)',
    responsibility: 'M&E and KM Manager',
    household: true,
  });
  await ind('OUTREACH', {
    code: 'OR-HDR-1A',
    name: 'Corresponding number of households reached (1a)',
    description: 'Total households header indicator',
    unit: 'Households',
    midTarget: 150000,
    endTarget: 300000,
    frequency: 'ANNUAL',
    source: 'M&E data (Results Framework)',
    responsibility: 'M&E and KM Manager',
    household: true,
  });

  // ── Project Goal — 3 missing group headers ────────────────────────────────
  console.log('\nProject Goal (3 missing):');
  await ind('GOAL', {
    code: 'GL-HDR-INC',
    name: 'Households with more than 70% increase in income',
    description: 'Project Goal income group header',
    frequency: 'MID_TERM',
    source: 'Household Level Baseline, Mid-term Review, Impact Study, and Project Completion Study',
    responsibility: 'PMU / External agency',
    household: true,
  });
  await ind('GOAL', {
    code: 'GL-HDR-PROD',
    name: 'CI 1.2.4 — Households with an increase in production by more than 30% (niche and horticultural crops)',
    description: 'IFAD Core Indicator CI 1.2.4 group header',
    frequency: 'MID_TERM',
    source: 'Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    household: true,
  });
  await ind('GOAL', {
    code: 'GL-HDR-PRDV',
    name: 'Households with an increase in productivity by more than 15% (niche and horticultural crops)',
    description: 'Project Goal productivity group header',
    frequency: 'MID_TERM',
    source: 'Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    household: true,
  });

  // ── Development Objective — 2 missing group headers ──────────────────────
  console.log('\nDevelopment Objective (2 missing):');
  await ind('DEV-OBJ', {
    code: 'DO-HDR-PROD',
    name: 'Increase in productivity of crops, spices and horticultural produce',
    description: 'Development Objective productivity group header',
    frequency: 'MID_TERM',
    source: 'Baseline survey, mid-term survey',
    responsibility: 'PMU / External agency',
  });
  await ind('DEV-OBJ', {
    code: 'DO-HDR-GRADE',
    name: 'Percentage of select niche and horticulture produce marketed as A-grade/premium product',
    description: 'Development Objective premium marketing group header',
    frequency: 'MID_TERM',
    source: 'Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });

  // ── Outcome 1 — 2 missing group headers ──────────────────────────────────
  console.log('\nOutcome 1 (2 missing):');
  await ind('OC-1', {
    code: 'OC1-HDR-221',
    name: 'CI 2.2.1 — Persons with new jobs / employment opportunities',
    description: 'IFAD Core Indicator CI 2.2.1 group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });
  await ind('OC-1', {
    code: 'OC1-HDR-224',
    name: 'CI 2.2.4 — Supported rural producers\' organizations providing new or improved services to their members',
    description: 'IFAD Core Indicator CI 2.2.4 group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });

  // ── Outcome 2 — 1 missing group header ───────────────────────────────────
  console.log('\nOutcome 2 (1 missing):');
  await ind('OC-2', {
    code: 'OC2-HDR-322',
    name: 'CI 3.2.2 — Households reporting adoption of environmentally sustainable and climate-resilient technologies and practices',
    description: 'IFAD Core Indicator CI 3.2.2 group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    household: true,
  });

  // ── Output 2.1 — 1 missing group header ──────────────────────────────────
  console.log('\nOutput 2.1 (1 missing):');
  await ind('OP-2.1', {
    code: 'OP21-HDR-GAP',
    name: 'No. of farmers trained in GAP (niche and horticultural crops)',
    description: 'GAP training group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Output 2.3 — 1 missing group header ──────────────────────────────────
  console.log('\nOutput 2.3 (1 missing):');
  await ind('OP-2.3', {
    code: 'OP23-HDR-WMS',
    name: 'No. of water management systems established',
    description: 'Water management systems group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Output 2.4 — 1 missing group header ──────────────────────────────────
  console.log('\nOutput 2.4 (1 missing):');
  await ind('OP-2.4', {
    code: 'OP24-HDR-NUR',
    name: 'No. of nurseries established',
    description: 'Nurseries group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Outcome 3 — 3 missing ─────────────────────────────────────────────────
  console.log('\nOutcome 3 (3 missing):');
  await ind('OC-3', {
    code: 'OC3-HDR-FGP',
    name: 'Percentage of farmers reporting increase in farm gate prices',
    description: 'Farm gate price group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });
  await ind('OC-3', {
    code: 'OC3-HDR-222',
    name: 'CI 2.2.2 — Supported rural enterprises reporting an increase in profit',
    description: 'IFAD Core Indicator CI 2.2.2 group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });
  await ind('OC-3', {
    code: 'OC3-HDR-STRT',
    name: 'Percentage of start-ups supported with youth ownership',
    description: 'Youth start-up group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    youth: true,
  });

  // ── Output 3.1 — 2 missing ───────────────────────────────────────────────
  console.log('\nOutput 3.1 (2 missing):');
  await ind('OP-3.1', {
    code: 'OP31-HDR-ENT',
    name: 'Number of enterprises supported',
    description: 'Enterprise promotion group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });
  await ind('OP-3.1', {
    code: 'OP31-HDR-212',
    name: 'CI 2.1.2 — Persons trained in income-generating activities or business management',
    description: 'IFAD Core Indicator CI 2.1.2 group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Output 3.2 — 2 missing ───────────────────────────────────────────────
  console.log('\nOutput 3.2 (2 missing):');
  await ind('OP-3.2', {
    code: 'OP32-HDR-MSP',
    name: 'Number of MSP conducted',
    description: 'Market support programme group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });
  await ind('OP-3.2', {
    code: 'OP32-HDR-BSM',
    name: 'Number of Buyer-Seller meets conducted',
    description: 'Buyer-seller meets group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Output 3.3 — 2 missing ───────────────────────────────────────────────
  console.log('\nOutput 3.3 (2 missing):');
  await ind('OP-3.3', {
    code: 'OP33-HDR-SEED',
    name: 'Number of start-ups supported with seed funds',
    description: 'Seed fund start-ups group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });
  await ind('OP-3.3', {
    code: 'OP33-HDR-SCALE',
    name: 'Number of start-ups accessing scale-up funds',
    description: 'Scale-up fund start-ups group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });

  // ── Outcome 4 — 3 missing ─────────────────────────────────────────────────
  console.log('\nOutcome 4 (3 missing):');
  await ind('OC-4', {
    code: 'OC4-HDR-WOOL',
    name: 'Percentage of pastoralists reporting improvements in wool prices',
    description: 'Pastoralist wool price group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
  });
  await ind('OC-4', {
    code: 'OC4-HDR-LIV',
    name: 'Percentage of vulnerable households reporting diversification of livelihood options',
    description: 'Livelihood diversification group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    household: true,
  });
  await ind('OC-4', {
    code: 'OC4-HDR-YUTH',
    name: 'Percentage of youth clubs participating in community action related to environment',
    description: 'Youth clubs environment group header',
    frequency: 'MONTHLY',
    source: 'MIS, Baseline survey, mid-term survey and end-line survey',
    responsibility: 'PMU / External agency',
    youth: true,
  });

  // ── Output 4.2 — 2 missing ───────────────────────────────────────────────
  console.log('\nOutput 4.2 (2 missing):');
  await ind('OP-4.2', {
    code: 'OP42-HDR-VUL',
    name: 'No. of persons from vulnerable community members supported for enterprise development',
    description: 'Vulnerable community enterprise support group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
  });
  await ind('OP-4.2', {
    code: 'OP42-HDR-CLUB',
    name: 'Number of youth clubs supported',
    description: 'Youth clubs group header',
    frequency: 'MONTHLY',
    source: 'MIS',
    responsibility: 'PMU',
    youth: true,
  });

  // ── Final count ──────────────────────────────────────────────────────────
  const total = await prisma.indicator.count();
  console.log(`\n─────────────────────────────────────`);
  console.log(`✅ Done. Total indicators in DB: ${total}`);
  if (total === 130) {
    console.log('🎉 Full logframe of 130 indicators achieved!');
  } else {
    console.log(`ℹ Expected 130 — difference: ${130 - total}`);
  }
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
