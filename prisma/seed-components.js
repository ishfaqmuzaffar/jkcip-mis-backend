// prisma/seed-components.js
// Populates the real JKCIP Component / SubComponent / Scheme structure.
// Source of truth: https://jkcip.jk.gov.in (Quick Report page — Component > Sub-Component > Scheme,
// each scheme's "Agency:" field is the implementing department). Verified against the portal's own
// totals: 3 components, 9 sub-components, 56 + 16 + 12 = 84 schemes.
// Run AFTER seed.js:  node prisma/seed-components.js
// Safe to run multiple times - uses upsert.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const AGENCY = {
  SKUAST: 'SKUAST-J, SKUAST-K',
  AGRI: 'Department of Agriculture Jammu (DoAJ), Department of Agriculture Kashmir (DoAK)',
  HORT: 'Department of Horticulture Jammu (DoHJ), Department of Horticulture Kashmir (DoHK)',
  HPM: 'Department of Horticulture Planning & Marketing J&K (HPM)',
  SHEEP: 'Department of Sheep Husbandry Jammu (SHDJ), Department of Sheep Husbandry Kashmir (SHDK)',
  ANIMAL: 'Department of Animal Husbandry Jammu (AHDJ), Department of Animal Husbandry Kashmir (AHDK)',
  FISH: 'Fisheries department, J&K (FJK)',
};

async function main() {
  console.log('🌱 Seeding real JKCIP Component structure from jkcip.jk.gov.in...\n');

  // A scheme was previously entered manually under code 'FPO' before this structure existed.
  // Fold it into the real UCFPO-01 slot instead of leaving a duplicate behind.
  const legacy = await prisma.scheme.findUnique({ where: { code: 'FPO' } });
  if (legacy) {
    await prisma.scheme.update({
      where: { id: legacy.id },
      data: { code: 'UCFPO-01', title: 'Apply for establishment of a new FPO', description: null },
    });
    console.log('  ↺ Folded legacy scheme "FPO" into UCFPO-01\n');
  }

  async function component(code, data) {
    return prisma.component.upsert({ where: { code }, update: data, create: { code, ...data } });
  }
  async function subComponent(code, data) {
    return prisma.subComponent.upsert({ where: { code }, update: data, create: { code, ...data } });
  }
  async function schemes(subComponentId, department, list) {
    for (let i = 0; i < list.length; i++) {
      const code = `${list.code}-${String(i + 1).padStart(2, '0')}`;
      await prisma.scheme.upsert({
        where: { code },
        update: { title: list[i], department, subComponentId },
        create: {
          title: list[i], code, department, status: 'ACTIVE',
          budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0,
          subComponentId,
        },
      });
    }
    console.log(`  ✓ ${list.code}: ${list.length} schemes`);
  }
  // helper to attach the code prefix onto the list array itself for `schemes()` above
  function L(code, ...items) { items.code = code; return items; }

  // ─── COMPONENT 1: Climate Smart and Market Led Production ───────────────────
  const comp1 = await component('COMP-1', {
    name: 'Climate Smart and Market Led Production',
    description: 'Supports smallholder farmers through collectivization, niche crop promotion and horticulture development with climate-smart approaches.',
    color: '#15803d', sortOrder: 1, active: true,
  });

  const ucfpo = await subComponent('UCFPO', {
    name: 'Upscaling Collectivisation - Promotion of FPO',
    description: 'Support for formation and strengthening of Farmer Producer Organizations (FPOs)',
    sortOrder: 1, componentId: comp1.id,
  });
  await schemes(ucfpo.id, AGENCY.SKUAST, L('UCFPO',
    'Apply for establishment of a new FPO',
    'Apply for strengthening of existing FPOs',
    'Farm mechanisation and drudgery reduction - business vertical support',
    'Water management support - business vertical support',
    'Aggregation support - business vertical support',
    'FPO managed ASC - business vertical support',
    'FPO managed orchard management business - business vertical support',
    'Other emerging businesses - business vertical support',
    'Apex Cooperative support',
    'FPO mobilization support',
    'Office equipments',
    'Matching Equity support',
    'Management cost support - first three year',
  ));

  const ancp = await subComponent('ANCP', {
    name: 'Agri-niche crop promotion',
    description: 'Support for saffron, aromatic rice, vegetables and other niche crop area expansion',
    sortOrder: 2, componentId: comp1.id,
  });
  await schemes(ancp.id, AGENCY.AGRI, L('ANCP',
    'Seed village promotion',
    'Seed business',
    'Entrepreneur managed ASC',
    'Area expansion - Saffron',
    'Area expansion - Aromatic Rice (Basmati)',
    'Area expansion - Aromatic Rice (Mushkbudji)',
    'Area expansion - Vegetables',
    'Area expansion - Aromatic and Medicinal Plants',
    'Area expansion - Others (Shallot)',
    'Area expansion - Others (Hill garlic)',
    'Area expansion - Others (Willow production)',
    'Creation of water management systems',
    'Protected Cultivation',
    'Area expansion - Bhaderwah Rajma',
    'Kalazeera',
    'Establishment of Elite Willow Block',
  ));

  const hcs = await subComponent('HCS', {
    name: 'Horticulture crop support',
    description: 'Support for apple, walnut, mango, citrus and stone fruit horticulture with nurseries and water management',
    sortOrder: 3, componentId: comp1.id,
  });
  await schemes(hcs.id, AGENCY.HORT, L('HCS',
    'Nursery Development - Apple',
    'Nursery Development - Pear',
    'Nursery Development - Walnuts',
    'Nursery Development - Stonefruits',
    'Nursery Development - Mango',
    'Nursery Development - Litchi',
    'Nursery Development - Citrus',
    'Solar Fencing',
    'Entrepreneur managed ASC',
    'Water management',
    'Crop management and expansion - Apple',
    'Crop management and expansion - Walnut',
    'Crop management and expansion - Mango',
    'Crop management and expansion - Litchi',
    'Crop management and expansion - Citrus',
    'Crop management and expansion - Kiwi',
    'Crop management and expansion - Guava',
    'Crop management and expansion - Dragonfruit',
    'Crop management and expansion - Others (Ber)',
    'Crop management and expansion - Others(Pear)',
    'Crop management and expansion - Others (Pecanut)',
    'Crop management and expansion - Others (Pomegranate)',
    'Crop management and expansion - Others (Almond)',
    'Crop management and expansion - Others (Plum)',
    'Crop management and expansion - Others (Avocado)',
    'Crop management and expansion - Rejuvenation',
    'Entrepreneur led Orchard Management',
  ));
  console.log('✅ Component 1: Climate Smart and Market Led Production (13+16+27 = 56 schemes)\n');

  // ─── COMPONENT 2: Agribusiness Ecosystem Development ────────────────────────
  const comp2 = await component('COMP-2', {
    name: 'Agribusiness Ecosystem Development',
    description: 'Develops enterprises, market linkages, and start-up ecosystems for agribusiness growth.',
    color: '#d97706', sortOrder: 2, active: true,
  });

  const eps = await subComponent('EPS', {
    name: 'Enterprise promotion support',
    description: 'Cold storage, pack houses, grading lines and agri-enterprise support',
    sortOrder: 1, componentId: comp2.id,
  });
  await prisma.scheme.upsert({ where: { code: 'EPS-01' }, update: { title: 'CA store', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'CA store', code: 'EPS-01', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-02' }, update: { title: 'Integrated pack house', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'Integrated pack house', code: 'EPS-02', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-03' }, update: { title: 'Processing unit - large', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'Processing unit - large', code: 'EPS-03', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-04' }, update: { title: 'Other enterprises (Specify)', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'Other enterprises (Specify)', code: 'EPS-04', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-05' }, update: { title: 'Mini-grading line - individual', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'Mini-grading line - individual', code: 'EPS-05', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-06' }, update: { title: 'Grading line with washer - individual', department: AGENCY.HPM, subComponentId: eps.id }, create: { title: 'Grading line with washer - individual', code: 'EPS-06', department: AGENCY.HPM, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-07' }, update: { title: 'Agro-tourism', department: AGENCY.AGRI, subComponentId: eps.id }, create: { title: 'Agro-tourism', code: 'EPS-07', department: AGENCY.AGRI, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-08' }, update: { title: 'Mushroom production', department: AGENCY.AGRI, subComponentId: eps.id }, create: { title: 'Mushroom production', code: 'EPS-08', department: AGENCY.AGRI, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-09' }, update: { title: 'Honey production & processing', department: AGENCY.AGRI, subComponentId: eps.id }, create: { title: 'Honey production & processing', code: 'EPS-09', department: AGENCY.AGRI, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-10' }, update: { title: 'MAP processing', department: AGENCY.AGRI, subComponentId: eps.id }, create: { title: 'MAP processing', code: 'EPS-10', department: AGENCY.AGRI, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  await prisma.scheme.upsert({ where: { code: 'EPS-11' }, update: { title: 'Others', department: AGENCY.AGRI, subComponentId: eps.id }, create: { title: 'Others', code: 'EPS-11', department: AGENCY.AGRI, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: eps.id } });
  console.log('  ✓ EPS: 11 schemes');

  const iss = await subComponent('ISS', {
    name: 'Incubation and startup support',
    description: 'Seed and scale-up capital for agri start-ups',
    sortOrder: 2, componentId: comp2.id,
  });
  await schemes(iss.id, AGENCY.SKUAST, L('ISS', 'Seed capital/ Challenge fund', 'Scale up capital'));

  const mps = await subComponent('MPS', {
    name: 'Market promotion Support',
    description: 'Brand promotion, branded kiosks and marketing outlets',
    sortOrder: 3, componentId: comp2.id,
  });
  await schemes(mps.id, AGENCY.HPM, L('MPS', 'Brand Promotion', 'Branded Kiosks', 'Marketing Outlets'));
  console.log('✅ Component 2: Agribusiness Ecosystem Development (11+2+3 = 16 schemes)\n');

  // ─── COMPONENT 3: Support to vulnerable communities ──────────────────────────
  const comp3 = await component('COMP-3', {
    name: 'Support to vulnerable communities',
    description: 'Targeted support for pastoralists, indigenous communities, youth, and other vulnerable groups.',
    color: '#7c3aed', sortOrder: 3, active: true,
  });

  const svc = await subComponent('SVC', {
    name: 'Support to other vulnerable communities',
    description: 'Livestock, fisheries and enterprise support for vulnerable households',
    sortOrder: 1, componentId: comp3.id,
  });
  await prisma.scheme.upsert({ where: { code: 'SVC-01' }, update: { title: 'Sheep/ goat unit', department: AGENCY.SHEEP, subComponentId: svc.id }, create: { title: 'Sheep/ goat unit', code: 'SVC-01', department: AGENCY.SHEEP, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-02' }, update: { title: 'Milk collection unit', department: AGENCY.ANIMAL, subComponentId: svc.id }, create: { title: 'Milk collection unit', code: 'SVC-02', department: AGENCY.ANIMAL, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-03' }, update: { title: 'Processing of milk products', department: AGENCY.ANIMAL, subComponentId: svc.id }, create: { title: 'Processing of milk products', code: 'SVC-03', department: AGENCY.ANIMAL, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-04' }, update: { title: 'Iceboxes for fish', department: AGENCY.FISH, subComponentId: svc.id }, create: { title: 'Iceboxes for fish', code: 'SVC-04', department: AGENCY.FISH, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-05' }, update: { title: 'fish vending machines', department: AGENCY.FISH, subComponentId: svc.id }, create: { title: 'fish vending machines', code: 'SVC-05', department: AGENCY.FISH, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-06' }, update: { title: 'Enterprise support - income diversification', department: AGENCY.SHEEP, subComponentId: svc.id }, create: { title: 'Enterprise support - income diversification', code: 'SVC-06', department: AGENCY.SHEEP, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-07' }, update: { title: 'Enterprise support - income diversification -Fisheries', department: AGENCY.FISH, subComponentId: svc.id }, create: { title: 'Enterprise support - income diversification -Fisheries', code: 'SVC-07', department: AGENCY.FISH, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  await prisma.scheme.upsert({ where: { code: 'SVC-08' }, update: { title: 'Enterprise support - income diversification -Animal', department: AGENCY.ANIMAL, subComponentId: svc.id }, create: { title: 'Enterprise support - income diversification -Animal', code: 'SVC-08', department: AGENCY.ANIMAL, status: 'ACTIVE', budget: 0, utilizedBudget: 0, targetBeneficiaries: 0, achievedBeneficiaries: 0, subComponentId: svc.id } });
  console.log('  ✓ SVC: 8 schemes');

  const past = await subComponent('PAST', {
    name: 'Support for Pastoralists',
    description: 'Wool sector support and goat breed improvement for pastoralist communities',
    sortOrder: 2, componentId: comp3.id,
  });
  await schemes(past.id, AGENCY.SHEEP, L('PAST',
    'Wool Sector Support',
    'Wool Processing with Private Partners',
    'Apply for Goat Breed improvement cluster',
  ));

  const yc = await subComponent('YC', {
    name: 'Youth Clubs',
    description: 'Youth participation in JKCIP environmental and climate action activities',
    sortOrder: 3, componentId: comp3.id,
  });
  await schemes(yc.id, AGENCY.AGRI, L('YC', 'Application for Participation in JKCIP Environmental & Climate Action Activities'));
  console.log('✅ Component 3: Support to vulnerable communities (8+3+1 = 12 schemes)\n');

  const totalComponents = await prisma.component.count();
  const totalSubComponents = await prisma.subComponent.count();
  const totalSchemes = await prisma.scheme.count();
  console.log(`🎉 Component structure complete!`);
  console.log(`   Components    : ${totalComponents} (expect 3)`);
  console.log(`   Sub-components: ${totalSubComponents} (expect 9)`);
  console.log(`   Total schemes : ${totalSchemes} (expect 84)`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
