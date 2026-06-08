// prisma/fix-logframe-nodes.js
// Fixes logframe node titles and removes ghost nodes (O1, OP1, OP2, O2, OP3)
// Run with: node prisma/fix-logframe-nodes.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Ghost node codes to delete (old short codes from early seeding)
const GHOST_CODES = ['O1', 'OP1', 'OP2', 'O2', 'OP3'];

// Correct titles keyed by the ACTUAL codes in the DB (OC-1, OP-1.1 etc.)
const NODE_TITLE_FIXES = {
  'OUTREACH':  'Outreach',
  'GOAL':      'Contribute to the sustained increase in incomes of rural households by improving the competitiveness of the farming operations',
  'DEV-OBJ':  'Improve the competitiveness of the farmers through a value chain approach covering production, value addition of high value niche crops, spices and horticulture produce',
  'OC-1':     "Outcome 1: Expansion and improved performance of Rural Producers' Organizations (FPOs)",
  'OC-2':     'Outcome 2: Enhanced productivity and production (niche and horticultural crops)',
  'OC-3':     'Outcome 3: Improved price realization of Agri and allied farmers',
  'OC-4':     'Outcome 4: Improved resilience of vulnerable groups',
  'OC-5':     'Outcome 5: Project management systems strengthened',
  'OP-1.1':   'Output 1.1: Scaling up collectivization',
  'OP-2.1':   'Output 2.1: GAP training',
  'OP-2.2':   'Output 2.2: Access to inputs and technology packages',
  'OP-2.3':   'Output 2.3: Water management systems established',
  'OP-2.4':   'Output 2.4: Nurseries established',
  'OP-3.1':   'Output 3.1: Enterprise promotion',
  'OP-3.2':   'Output 3.2: Market promotion',
  'OP-3.3':   'Output 3.3: Incubation and start-up',
  'OP-4.1':   'Output 4.1: Pastoralists support',
  'OP-4.2':   'Output 4.2: Support to other vulnerable groups',
  'OP-5.1':   'Output 5.1: Policy engagement',
  'OP-5.2':   'Output 5.2: Staff training of Agri and allied Directorates',
};

// Clean indicator names — keyed by the indicator code already in the DB
// Maps old generic names → clean names
const INDICATOR_NAME_FIXES = {
  'outreach-ind-001': 'Persons reached by project-supported activities',
  'outreach-ind-002': 'Males reached',
  'outreach-ind-003': 'Females reached',
  'outreach-ind-004': 'Young people reached',
  'outreach-ind-005': 'Indigenous people reached (SC/ST)',
  'outreach-ind-006': 'Total persons receiving services',
  'outreach-ind-007': 'Male share of total outreach',
  'outreach-ind-008': 'Female share of total outreach',
  'outreach-ind-009': 'Youth share of total outreach',
  'outreach-ind-010': 'Estimated total household members (1b)',
  'outreach-ind-011': 'Total household members reached',
  'outreach-ind-012': 'Corresponding number of households reached (1a)',
  'outreach-ind-013': 'Women-headed households reached',
  'outreach-ind-014': 'Non-women-headed households reached',
  'outreach-ind-015': 'Total households reached',
  'project-goal-ind-016': 'Households with >70% increase in income',
  'project-goal-ind-017': 'Households with >70% income increase (%)',
  'project-goal-ind-018': 'CI 1.2.4 — Households with >30% increase in production',
  'project-goal-ind-019': 'Households with >30% production increase (%)',
  'project-goal-ind-020': 'Households with >15% increase in productivity',
  'project-goal-ind-021': 'Households with >15% productivity increase (%)',
  'development-objective-ind-022': 'Increase in productivity of crops, spices and horticulture produce',
  'development-objective-ind-023': 'Saffron productivity (Kg/ha)',
  'development-objective-ind-024': 'Kashmiri Chilli productivity (Kg/ha)',
  'development-objective-ind-025': 'Apple productivity (MT/ha)',
  'development-objective-ind-026': 'Walnut productivity (MT/ha)',
  'development-objective-ind-027': 'Mango productivity (MT/ha)',
  'development-objective-ind-028': 'Citrus productivity (MT/ha)',
  'development-objective-ind-029': 'Stone fruits productivity (MT/ha)',
  'development-objective-ind-030': 'Niche and horticulture produce marketed as A-grade/premium',
  'development-objective-ind-031': 'Saffron marketed as premium (%)',
  'development-objective-ind-032': 'Vegetables marketed as premium (%)',
  'development-objective-ind-033': 'Kashmiri Chilli marketed as premium (%)',
  'development-objective-ind-034': 'Apple marketed as premium (%)',
  'development-objective-ind-035': 'Stone fruits marketed as premium (%)',
  'development-objective-ind-036': 'Mango marketed as premium (%)',
  'development-objective-ind-037': 'Citrus marketed as premium (%)',
  'outcome-1-ind-038': 'CI 2.2.1 — Persons with new jobs / employment opportunities',
  'outcome-1-ind-039': 'Male persons with new jobs',
  'outcome-1-ind-040': 'Female persons with new jobs',
  'outcome-1-ind-041': 'Indigenous people with new jobs',
  'outcome-1-ind-042': 'Young people with new jobs',
  'outcome-1-ind-043': 'Total persons with new jobs / employment opportunities',
  'outcome-1-ind-044': 'Persons with disabilities with new jobs',
  'outcome-1-ind-045': 'CI 2.2.4 — Supported rural POs providing new or improved services to members',
  'outcome-1-ind-046': 'Supported POs (number)',
  'outcome-1-ind-047': 'Total PO members',
  'outcome-1-ind-048': 'Male PO members',
  'outcome-1-ind-049': 'Female PO members',
  'outcome-1-ind-050': 'Young PO members',
  'outcome-1-ind-051': 'CI 2.2.5 — Rural POs reporting an increase in sales',
  'outcome-1-ind-052': 'Rural POs reporting increased sales (%)',
  'output-1-1-ind-053': 'FPOs supported',
  'output-1-1-ind-054': 'FPOs supported (number)',
  'output-1-1-ind-055': 'CI 2.1.4 — Supported rural producers that are PO members',
  'output-1-1-ind-056': 'Total rural producers who are PO members',
  'outcome-2-ind-057': 'CI 3.2.2 — Households adopting climate-resilient technologies and practices',
  'outcome-2-ind-058': 'Household members adopting climate-resilient practices',
  'outcome-2-ind-059': 'Households adopting climate-resilient practices (%)',
  'outcome-2-ind-060': 'Households adopting climate-resilient practices (number)',
  'outcome-2-ind-061': 'Area expansion under niche crops',
  'outcome-2-ind-062': 'Land under niche crops expansion (ha)',
  'outcome-2-ind-063': 'Area expansion under horticultural crops',
  'outcome-2-ind-064': 'Land under horticultural crops expansion (ha)',
  'output-2-1-ind-065': 'Farmers trained in GAP (niche and horticultural crops)',
  'output-2-1-ind-066': 'Farmers trained in GAP (number)',
  'output-2-2-ind-067': 'CI 1.1.3 — Rural producers accessing production inputs and/or technology packages',
  'output-2-2-ind-068': 'Male rural producers accessing inputs/technology',
  'output-2-2-ind-069': 'Female rural producers accessing inputs/technology',
  'output-2-2-ind-070': 'Young rural producers accessing inputs/technology',
  'output-2-2-ind-071': 'Total rural producers accessing inputs/technology',
  'output-2-2-ind-072': 'CI 3.1.4 — Land brought under climate-resilient practices',
  'output-2-2-ind-073': 'Land under climate-resilient practices (ha)',
  'output-2-3-ind-074': 'Water management systems established',
  'output-2-3-ind-075': 'Water management systems established (number)',
  'output-2-4-ind-076': 'Nurseries established',
  'output-2-4-ind-077': 'Nurseries established (number)',
  'outcome-3-ind-078': 'Farmers reporting increase in farm gate prices',
  'outcome-3-ind-079': 'Farmers reporting increased farm gate prices (%)',
  'outcome-3-ind-080': 'CI 2.2.2 — Supported rural enterprises reporting an increase in profit',
  'outcome-3-ind-081': 'Enterprises reporting increased profit (%)',
  'outcome-3-ind-082': 'Supported enterprises benefiting from improved market linkages',
  'outcome-3-ind-083': 'Enterprises with improved market linkages (%)',
  'outcome-3-ind-084': 'Start-ups supported with youth ownership',
  'outcome-3-ind-085': 'Start-ups with youth ownership (%)',
  'output-3-1-ind-086': 'Enterprises supported',
  'output-3-1-ind-087': 'Enterprises supported (number)',
  'output-3-1-ind-088': 'CI 2.1.2 — Persons trained in income-generating activities or business management',
  'output-3-1-ind-089': 'Male persons trained in IGAs or business management',
  'output-3-1-ind-090': 'Female persons trained in IGAs or business management',
  'output-3-1-ind-091': 'Young persons trained in IGAs or business management',
  'output-3-1-ind-092': 'Total persons trained in IGAs or business management',
  'output-3-2-ind-093': 'Market support programmes (MSPs) conducted',
  'output-3-2-ind-094': 'MSPs conducted (number)',
  'output-3-2-ind-095': 'Buyer-seller meets conducted',
  'output-3-2-ind-096': 'Buyer-seller meets conducted (number)',
  'output-3-3-ind-097': 'Start-ups supported with seed funds',
  'output-3-3-ind-098': 'Start-ups with seed funds (number)',
  'output-3-3-ind-099': 'Start-ups accessing scale-up funds',
  'output-3-3-ind-100': 'Start-ups accessing scale-up funds (number)',
  'outcome-4-ind-101': 'Pastoralists reporting improvements in wool prices',
  'outcome-4-ind-102': 'Pastoralists reporting improved wool prices (%)',
  'outcome-4-ind-103': 'Vulnerable households reporting diversification of livelihood options',
  'outcome-4-ind-104': 'Vulnerable households with diversified livelihoods (%)',
  'outcome-4-ind-105': 'Youth clubs participating in community environment actions',
  'outcome-4-ind-106': 'Youth clubs in community environment actions (%)',
  'output-4-1-ind-107': 'Pastoralists reporting improvements in wool price',
  'output-4-1-ind-108': 'Pastoralists with improved wool price (%)',
  'output-4-2-ind-109': 'Vulnerable community members supported for enterprise development',
  'output-4-2-ind-110': 'Vulnerable persons supported for enterprise development (number)',
  'output-4-2-ind-111': 'Youth clubs supported',
  'output-4-2-ind-112': 'Youth clubs supported (number)',
  'outcome-5-ind-113': 'SF 2.1 — Households satisfied with project-supported services',
  'outcome-5-ind-114': 'Household members satisfied with services (number)',
  'outcome-5-ind-115': 'Indigenous households satisfied with services',
  'outcome-5-ind-116': 'Women-headed households satisfied with services',
  'outcome-5-ind-117': 'Households satisfied with services (%)',
  'outcome-5-ind-118': 'Total households satisfied with services',
  'outcome-5-ind-119': 'SF 2.2 — Households able to influence decision-making of local authorities and service providers',
  'outcome-5-ind-120': 'Household members able to influence decision-making (number)',
  'outcome-5-ind-121': 'Indigenous households able to influence decision-making',
  'outcome-5-ind-122': 'Women-headed households able to influence decision-making',
  'outcome-5-ind-123': 'Households able to influence decision-making (%)',
  'outcome-5-ind-124': 'Total households able to influence decision-making',
  'output-5-1-ind-125': 'Policy studies conducted',
  'output-5-1-ind-126': 'Policy studies conducted (number)',
  'output-5-1-ind-127': 'Policy workshops conducted',
  'output-5-1-ind-128': 'Policy workshops conducted (number)',
  'output-5-2-ind-129': '100% recruitment of agreed human resources',
  'output-5-2-ind-130': 'Agreed positions filled (%)',
};

async function deleteNodeSafely(nodeId) {
  // Delete in order: progress → indicators → children (recursively) → node
  const children = await prisma.logframeNode.findMany({ where: { parentId: nodeId } });
  for (const child of children) {
    await deleteNodeSafely(child.id);
  }
  const indicators = await prisma.indicator.findMany({ where: { logframeNodeId: nodeId } });
  for (const ind of indicators) {
    await prisma.indicatorYearProgress.deleteMany({ where: { indicatorId: ind.id } });
    await prisma.indicator.delete({ where: { id: ind.id } });
  }
  // Check node still exists before deleting (may have been cascade-deleted)
  const exists = await prisma.logframeNode.findUnique({ where: { id: nodeId }, select: { id: true } });
  if (exists) {
    await prisma.logframeNode.delete({ where: { id: nodeId } });
  }
}

async function main() {
  console.log('🔧 JKCIP Logframe Fix Script\n');

  // ── Step 1: Delete ghost nodes ───────────────────────────────────────────
  console.log('🗑  Removing ghost nodes...');
  for (const code of GHOST_CODES) {
    const node = await prisma.logframeNode.findUnique({ where: { code } });
    if (!node) {
      console.log(`  ✓ "${code}" not found — already clean`);
      continue;
    }
    console.log(`  → Deleting [${node.id}] "${code}" — "${node.title}"`);
    await deleteNodeSafely(node.id);
    console.log(`    ✅ Deleted`);
  }
  console.log('');

  // ── Step 2: Fix node titles ──────────────────────────────────────────────
  console.log('📝 Fixing node titles...');
  let nodeFixed = 0;
  for (const [code, correctTitle] of Object.entries(NODE_TITLE_FIXES)) {
    const node = await prisma.logframeNode.findUnique({ where: { code } });
    if (!node) { console.log(`  ⚠ "${code}" not in DB — skipping`); continue; }
    if (node.title === correctTitle) continue;
    await prisma.logframeNode.update({ where: { id: node.id }, data: { title: correctTitle } });
    console.log(`  ✅ ${code}: "${correctTitle.slice(0, 65)}"`);
    nodeFixed++;
  }
  console.log(`  ${nodeFixed} node(s) updated.\n`);

  // ── Step 3: Fix indicator names ──────────────────────────────────────────
  console.log('📝 Fixing indicator names...');
  let indFixed = 0;
  for (const [code, correctName] of Object.entries(INDICATOR_NAME_FIXES)) {
    const ind = await prisma.indicator.findUnique({ where: { code } });
    if (!ind || ind.name === correctName) continue;
    await prisma.indicator.update({ where: { id: ind.id }, data: { name: correctName } });
    indFixed++;
  }
  console.log(`  ${indFixed} indicator(s) updated.\n`);

  // ── Step 4: Final summary ────────────────────────────────────────────────
  const finalNodes = await prisma.logframeNode.findMany({ orderBy: { sortOrder: 'asc' } });
  const finalIndicators = await prisma.indicator.count();
  console.log('─────────────────────────────────────────');
  console.log(`✅ Done. Nodes: ${finalNodes.length} | Indicators: ${finalIndicators}\n`);
  for (const n of finalNodes) {
    console.log(`  [${n.level.padEnd(22)}] ${n.code.padEnd(10)} ${n.title.slice(0, 65)}`);
  }
}

main()
  .catch((e) => { console.error('\n❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
