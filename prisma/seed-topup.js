// prisma/seed-topup.js
// Re-affirms GL-1/GL-2/GL-3 names and adds OC3-MKT-PCT, which were missing from the original seed.
// (15 other entries once lived here — breakdowns and "extra" indicators with no basis in the
// source logframe (verified against JKCIP_Logframe_Both_Years_1.xlsx) — removed 2026-07-13.)
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

  // ─── OUTCOME 3: Additional enterprise indicators ─────────────────────────
  // Excel row 86: % enterprises with improved market linkages
  await ind({ code: 'OC3-MKT-PCT', nodeCode: 'OC-3',
    name: '% supported enterprises benefiting from improved market linkages',
    unit: '%', mid: 30, end: 70, src: 'MIS, Baseline survey', resp: 'PMU/External agency' });

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