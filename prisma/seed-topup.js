// prisma/seed-topup.js
// Adds the 19 indicators missing from the original seed
// Safe to run multiple times - uses upsert
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Running logframe top-up seed...\n');

  // Helper
  async function ind(data) {
    const existing = await prisma.logframeNode.findUnique({ where: { code: data.nodeCode } });
    if (!existing) {
      console.warn(`  ⚠ Node ${data.nodeCode} not found - skipping ${data.code}`);
      return;
    }
    await prisma.indicator.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        unit: data.unit || null,
        baseline: data.baseline ?? null,
        midTarget: data.mid ?? null,
        endTarget: data.end ?? null,
      },
      create: {
        code: data.code,
        name: data.name,
        unit: data.unit || null,
        baseline: data.baseline ?? null,
        midTarget: data.mid ?? null,
        endTarget: data.end ?? null,
        frequency: data.freq || 'ANNUAL',
        source: data.src || 'MIS',
        responsibility: data.resp || 'PMU',
        active: true,
        supportsGenderBreakdown: data.gender || false,
        supportsYouthBreakdown: data.youth || false,
        supportsIndigenousBreakdown: data.indigenous || false,
        supportsHouseholdBreakdown: data.household || false,
        supportsDistrictBreakdown: false,
        supportsBlockBreakdown: false,
        logframeNodeId: existing.id,
      },
    });
    console.log(`  ✓ ${data.code} — ${data.name.substring(0, 60)}`);
  }

  // ─── GOAL: The 3 indicators had wrong names in original seed ──────────────
  // Excel rows 21, 23, 25 — these are % indicators under goal-level text headers
  // Verify they exist with correct full names:
  await ind({ code: 'GL-1', nodeCode: 'GOAL',
    name: 'Households with more than 70% increase in income (%)',
    unit: '%', mid: 30, end: 70, freq: 'END_TERM', resp: 'PMU/External agency', household: true });

  await ind({ code: 'GL-2', nodeCode: 'GOAL',
    name: 'CI 1.2.4 - Households with increase in production by more than 30% (niche field crops)',
    unit: '%', mid: 30, end: 70, freq: 'END_TERM', resp: 'PMU/External agency' });

  await ind({ code: 'GL-3', nodeCode: 'GOAL',
    name: 'Households with increase in productivity by more than 15% (niche and horticultural crops)',
    unit: '%', mid: 35, end: 80, freq: 'END_TERM', resp: 'PMU/External agency' });

  // ─── OUTCOME 1: check 2.2.4 - Indigenous people missing ─────────────────
  // Excel row 50-54 check - 2.2.4 has 5 sub-indicators + 2.2.5
  // Original seed may have missed indigenous count for POs
  // The Excel shows: POs (org), Total members, Males, Females, Young = 5
  // RIMS also requires Indigenous PO members - add if missing
  await ind({ code: 'OC1-224-IM', nodeCode: 'OC-1',
    name: '2.2.4 Indigenous PO members',
    unit: 'People', baseline: null, mid: null, end: null,
    resp: 'PMU', indigenous: true });

  // ─── OUTPUT 1.1: 2.1.4 needs gender breakdown ────────────────────────────
  await ind({ code: 'OP11-214-M', nodeCode: 'OP-1.1',
    name: '2.1.4 Rural producers as PO members - Males',
    unit: 'People', mid: 8029, end: 16059, freq: 'MONTHLY', resp: 'PMU', gender: true });
  await ind({ code: 'OP11-214-F', nodeCode: 'OP-1.1',
    name: '2.1.4 Rural producers as PO members - Females',
    unit: 'People', mid: 7121, end: 14241, freq: 'MONTHLY', resp: 'PMU', gender: true });
  await ind({ code: 'OP11-214-Y', nodeCode: 'OP-1.1',
    name: '2.1.4 Rural producers as PO members - Youth',
    unit: 'People', mid: 4545, end: 9090, freq: 'MONTHLY', resp: 'PMU', youth: true });

  // ─── OUTCOME 2: Area expansion needs baseline context ────────────────────
  // Verify niche and horticulture area - check if seeded correctly
  await ind({ code: 'OC2-NICHE-HA', nodeCode: 'OC-2',
    name: 'Area expansion under niche crops (hectares)',
    unit: 'ha', mid: 1403, end: 2805, src: 'MIS, Baseline survey', resp: 'PMU/External agency' });
  await ind({ code: 'OC2-HORT-HA', nodeCode: 'OC-2',
    name: 'Area expansion under horticultural crops (hectares)',
    unit: 'ha', mid: 773, end: 1545, src: 'MIS, Baseline survey', resp: 'PMU/External agency' });

  // ─── OUTPUT 2.2: 1.1.3 Indigenous breakdown ──────────────────────────────
  await ind({ code: 'OP22-113-I', nodeCode: 'OP-2.2',
    name: '1.1.3 Rural producers accessing production inputs - Indigenous',
    unit: 'People', mid: null, end: null, freq: 'MONTHLY', resp: 'PMU', indigenous: true });

  // ─── OUTPUT 2.2: 3.1.4 district-level disaggregation ────────────────────
  await ind({ code: 'OP22-314-HA', nodeCode: 'OP-2.2',
    name: '3.1.4 Land brought under climate-resilient practices (total ha)',
    unit: 'ha', mid: 773, end: 1545, freq: 'MONTHLY', resp: 'PMU' });

  // ─── OUTCOME 3: Additional enterprise indicators ─────────────────────────
  // Excel row 86: % enterprises with improved market linkages
  await ind({ code: 'OC3-MKT-PCT', nodeCode: 'OC-3',
    name: '% supported enterprises benefiting from improved market linkages',
    unit: '%', mid: 30, end: 70, src: 'MIS, Baseline survey', resp: 'PMU/External agency' });

  // ─── OUTPUT 4.1: Pastoralists - additional wool value chain ──────────────
  await ind({ code: 'OP41-WOOL-VAL', nodeCode: 'OP-4.1',
    name: '% increase in average wool price received by pastoralists',
    unit: '%', mid: 15, end: 30, freq: 'MONTHLY', resp: 'PMU' });

  // ─── OUTCOME 5: SF.2.1 - BPL/PHH household breakdown ────────────────────
  await ind({ code: 'OC5-SF21-BPL', nodeCode: 'OC-5',
    name: 'SF.2.1 BPL households satisfied with project services',
    unit: 'Households', mid: null, end: null, resp: 'PMU/External agency', household: true });

  await ind({ code: 'OC5-SF22-BPL', nodeCode: 'OC-5',
    name: 'SF.2.2 BPL households reporting influence on local authority decisions',
    unit: 'Households', mid: null, end: null, resp: 'PMU/External agency', household: true });

  // ─── OUTPUT 5.2: Additional HR/capacity indicators ───────────────────────
  await ind({ code: 'OP52-TRAIN', nodeCode: 'OP-5.2',
    name: 'Number of staff trained in M&E and knowledge management',
    unit: 'Number', mid: null, end: null, freq: 'MONTHLY', resp: 'PMU' });

  await ind({ code: 'OP52-MIS', nodeCode: 'OP-5.2',
    name: 'MIS system operational and updated (Yes/No)',
    unit: 'Binary', mid: 1, end: 1, freq: 'MONTHLY', resp: 'PMU' });

  // ─── PROJECT MANAGEMENT indicators ───────────────────────────────────────
  // Annual Progress Report submitted (Outcome 5 / Output 5.1)
  await ind({ code: 'OP51-APR', nodeCode: 'OP-5.1',
    name: 'Annual Progress Reports submitted to IFAD on time',
    unit: 'Number', mid: 4, end: 8, freq: 'ANNUAL', resp: 'PMU' });

  await ind({ code: 'OP51-AUDIT', nodeCode: 'OP-5.1',
    name: 'Audit reports submitted on time',
    unit: 'Number', mid: 4, end: 8, freq: 'ANNUAL', resp: 'PMU' });

  const total = await prisma.indicator.count();
  console.log(`\n✅ Top-up complete. Total indicators in database: ${total}`);

  if (total < 88) {
    console.log(`\n⚠ Still below 88. Run this to check what's in DB:`);
    console.log(`  docker exec <container> node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.indicator.count().then(n=>console.log('Count:',n))"`);
  } else {
    console.log(`\n🎉 All ${total} indicators loaded — full logframe coverage!`);
  }
}

main()
  .catch(e => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });