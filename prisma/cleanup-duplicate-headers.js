// prisma/cleanup-duplicate-headers.js
// Removes the duplicate header indicators created by seed-missing-26.js
// that already existed in the DB under different codes from the original seed.
// Run with: node prisma/cleanup-duplicate-headers.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// These codes were added by seed-missing-26.js but the same indicator
// already existed in the DB (from seed.js) under a different code.
// The original seed.js merged the header+value into a single row already.
const DUPLICATE_CODES = [
  'OP21-HDR-GAP',    // duplicate of OP21-GAP ("No. of farmers trained in GAP")
  'OP23-HDR-WMS',    // duplicate of OP23-WMS ("No. of water management systems established")
  'OP24-HDR-NUR',    // duplicate of OP24-NUR ("No. of nurseries established")
  'OP31-HDR-ENT',    // duplicate of OP31-ENT ("Number of enterprises supported")
  'OP31-HDR-212',    // duplicate — OP31 already has 5 indicators including the total
  'OP32-HDR-MSP',    // duplicate of OP32-MSP
  'OP32-HDR-BSM',    // duplicate of OP32-BSM
  'OP33-HDR-SEED',   // duplicate of OP33-SEED
  'OP33-HDR-SCALE',  // duplicate of OP33-SCALE
];

async function main() {
  console.log('🧹 Removing duplicate header indicators\n');

  const before = await prisma.indicator.count();
  console.log(`Indicators before: ${before}`);

  let removed = 0;
  for (const code of DUPLICATE_CODES) {
    const ind = await prisma.indicator.findUnique({ where: { code } });
    if (!ind) {
      console.log(`  ✓ "${code}" not found — already clean`);
      continue;
    }
    // Delete progress rows first
    await prisma.indicatorYearProgress.deleteMany({ where: { indicatorId: ind.id } });
    await prisma.indicator.delete({ where: { id: ind.id } });
    console.log(`  🗑 Deleted "${code}": ${ind.name}`);
    removed++;
  }

  const after = await prisma.indicator.count();
  console.log(`\nRemoved: ${removed}`);
  console.log(`Indicators after: ${after}`);
  if (after === 130) {
    console.log('✅ Perfect — 130 indicators, matching the official JKCIP logframe.');
  } else {
    console.log(`ℹ Target is 130. Difference: ${after - 130}`);
  }
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
