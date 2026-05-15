// prisma/seed-components.js
// Run AFTER seed.js:  node prisma/seed-components.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JKCIP Component structure...\n');

  // ─── COMPONENT 1 ──────────────────────────────────────────────────────────
  const comp1 = await prisma.component.upsert({
    where: { code: 'COMP-1' },
    update: {},
    create: {
      name: 'Climate Smart and Market Led Production',
      code: 'COMP-1',
      description: 'Supports smallholder farmers through collectivization, niche crop promotion and horticulture development with climate-smart approaches.',
      color: '#15803d',
      sortOrder: 1,
      active: true,
    },
  });

  const sc11 = await prisma.subComponent.upsert({
    where: { code: 'SC-1.1' },
    update: {},
    create: {
      name: 'Upscaling Collectivisation - Promotion of FPO',
      code: 'SC-1.1',
      description: 'Support for formation and strengthening of Farmer Producer Organizations (FPOs)',
      sortOrder: 1,
      componentId: comp1.id,
    },
  });

  const sc12 = await prisma.subComponent.upsert({
    where: { code: 'SC-1.2' },
    update: {},
    create: {
      name: 'Agri-Niche Crop Promotion',
      code: 'SC-1.2',
      description: 'Support for saffron, Kashmiri chilli, and other niche crop production with GAP training and input access',
      sortOrder: 2,
      componentId: comp1.id,
    },
  });

  const sc13 = await prisma.subComponent.upsert({
    where: { code: 'SC-1.3' },
    update: {},
    create: {
      name: 'Horticulture Crop Support',
      code: 'SC-1.3',
      description: 'Support for apple, walnut, mango, citrus and stone fruit horticulture with nurseries and water management',
      sortOrder: 3,
      componentId: comp1.id,
    },
  });

  console.log('✅ Component 1: Climate Smart and Market Led Production');
  console.log('   Sub-components: SC-1.1, SC-1.2, SC-1.3');

  // ─── COMPONENT 1 SCHEMES ──────────────────────────────────────────────────

  // SC-1.1 FPO schemes
  const fpoSchemes = [
    { title: 'Apply for establishment of a new FPO', code: 'SC11-FPO-NEW' },
    { title: 'Apply for strengthening of existing FPOs', code: 'SC11-FPO-STR' },
    { title: 'Farm mechanisation and drudgery reduction - business vertical support', code: 'SC11-MECH' },
    { title: 'Water management support - business vertical support', code: 'SC11-WTR' },
    { title: 'Aggregation support - business vertical support', code: 'SC11-AGG' },
    { title: 'FPO managed ASC - business vertical support', code: 'SC11-ASC' },
    { title: 'FPO managed orchard management business - business vertical support', code: 'SC11-ORCH' },
    { title: 'Other emerging businesses - business vertical support', code: 'SC11-OTH' },
    { title: 'Apex Cooperative support', code: 'SC11-APEX' },
    { title: 'FPO mobilization support', code: 'SC11-MOB' },
    { title: 'Office equipments', code: 'SC11-EQUIP' },
    { title: 'Matching Equity support', code: 'SC11-EQ' },
    { title: 'Management cost support - first three years', code: 'SC11-MGMT' },
  ];

  for (let i = 0; i < fpoSchemes.length; i++) {
    await prisma.scheme.upsert({
      where: { code: fpoSchemes[i].code },
      update: {},
      create: {
        title: fpoSchemes[i].title,
        code: fpoSchemes[i].code,
        department: 'Agriculture',
        status: 'ACTIVE',
        budget: 0,
        utilizedBudget: 0,
        targetBeneficiaries: 0,
        achievedBeneficiaries: 0,
        subComponentId: sc11.id,
      },
    });
  }
  console.log(`   ✅ SC-1.1: ${fpoSchemes.length} FPO schemes created`);

  // SC-1.2 Niche crop schemes
  const nicheSchemes = [
    { title: 'Saffron cultivation support', code: 'SC12-SAFF' },
    { title: 'Kashmiri Chilli promotion', code: 'SC12-CHIL' },
    { title: 'GAP training for niche crops', code: 'SC12-GAP' },
    { title: 'Soil health card and input supply', code: 'SC12-SOIL' },
    { title: 'Seed and planting material support', code: 'SC12-SEED' },
    { title: 'Saffron processing unit support', code: 'SC12-PROC' },
  ];

  for (const s of nicheSchemes) {
    await prisma.scheme.upsert({
      where: { code: s.code },
      update: {},
      create: {
        title: s.title, code: s.code,
        department: 'Agriculture', status: 'ACTIVE',
        budget: 0, utilizedBudget: 0,
        targetBeneficiaries: 0, achievedBeneficiaries: 0,
        subComponentId: sc12.id,
      },
    });
  }
  console.log(`   ✅ SC-1.2: ${nicheSchemes.length} niche crop schemes created`);

  // SC-1.3 Horticulture schemes
  const hortSchemes = [
    { title: 'Apple orchard development support', code: 'SC13-APPL' },
    { title: 'Walnut plantation support', code: 'SC13-WALN' },
    { title: 'Nursery establishment support', code: 'SC13-NUR' },
    { title: 'Irrigation and water management systems', code: 'SC13-IRR' },
    { title: 'Horticultural GAP training', code: 'SC13-GAP' },
    { title: 'Post-harvest infrastructure support', code: 'SC13-PHI' },
    { title: 'Packaging and grading support', code: 'SC13-PKG' },
  ];

  for (const s of hortSchemes) {
    await prisma.scheme.upsert({
      where: { code: s.code },
      update: {},
      create: {
        title: s.title, code: s.code,
        department: 'Horticulture', status: 'ACTIVE',
        budget: 0, utilizedBudget: 0,
        targetBeneficiaries: 0, achievedBeneficiaries: 0,
        subComponentId: sc13.id,
      },
    });
  }
  console.log(`   ✅ SC-1.3: ${hortSchemes.length} horticulture schemes created`);

  // ─── COMPONENT 2 ──────────────────────────────────────────────────────────
  const comp2 = await prisma.component.upsert({
    where: { code: 'COMP-2' },
    update: {},
    create: {
      name: 'Agribusiness Ecosystem Development',
      code: 'COMP-2',
      description: 'Develops enterprises, market linkages, and start-up ecosystems for agribusiness growth.',
      color: '#d97706',
      sortOrder: 2,
      active: true,
    },
  });

  const sc21 = await prisma.subComponent.upsert({
    where: { code: 'SC-2.1' },
    update: {},
    create: {
      name: 'Enterprise Promotion',
      code: 'SC-2.1',
      description: 'Support for agri-enterprise development and business management training',
      sortOrder: 1,
      componentId: comp2.id,
    },
  });

  const sc22 = await prisma.subComponent.upsert({
    where: { code: 'SC-2.2' },
    update: {},
    create: {
      name: 'Market Promotion and Linkages',
      code: 'SC-2.2',
      description: 'Buyer-seller meets, market stakeholder platforms, and value chain linkages',
      sortOrder: 2,
      componentId: comp2.id,
    },
  });

  const sc23 = await prisma.subComponent.upsert({
    where: { code: 'SC-2.3' },
    update: {},
    create: {
      name: 'Incubation and Start-up Support',
      code: 'SC-2.3',
      description: 'Seed funds, scale-up funds, and incubation support for agri start-ups',
      sortOrder: 3,
      componentId: comp2.id,
    },
  });

  const entSchemes = [
    { title: 'Agri-enterprise development support', code: 'SC21-ENT', sub: sc21.id },
    { title: 'Business management and IGA training', code: 'SC21-BM', sub: sc21.id },
    { title: 'Value chain financing support', code: 'SC21-FIN', sub: sc21.id },
    { title: 'Market Stakeholder Platform (MSP)', code: 'SC22-MSP', sub: sc22.id },
    { title: 'Buyer-Seller meet facilitation', code: 'SC22-BSM', sub: sc22.id },
    { title: 'Export linkage support', code: 'SC22-EXP', sub: sc22.id },
    { title: 'E-commerce and digital market support', code: 'SC22-ECOM', sub: sc22.id },
    { title: 'Start-up seed fund support', code: 'SC23-SEED', sub: sc23.id },
    { title: 'Start-up scale-up fund support', code: 'SC23-SCALE', sub: sc23.id },
    { title: 'Incubation centre support', code: 'SC23-INCUB', sub: sc23.id },
  ];

  for (const s of entSchemes) {
    await prisma.scheme.upsert({
      where: { code: s.code },
      update: {},
      create: {
        title: s.title, code: s.code,
        department: 'Agribusiness', status: 'ACTIVE',
        budget: 0, utilizedBudget: 0,
        targetBeneficiaries: 0, achievedBeneficiaries: 0,
        subComponentId: s.sub,
      },
    });
  }
  console.log('\n✅ Component 2: Agribusiness Ecosystem Development');
  console.log(`   ${entSchemes.length} schemes across SC-2.1, SC-2.2, SC-2.3`);

  // ─── COMPONENT 3 ──────────────────────────────────────────────────────────
  const comp3 = await prisma.component.upsert({
    where: { code: 'COMP-3' },
    update: {},
    create: {
      name: 'Support to Vulnerable Communities',
      code: 'COMP-3',
      description: 'Targeted support for pastoralists, indigenous communities, youth, and other vulnerable groups.',
      color: '#7c3aed',
      sortOrder: 3,
      active: true,
    },
  });

  const sc31 = await prisma.subComponent.upsert({
    where: { code: 'SC-3.1' },
    update: {},
    create: {
      name: 'Pastoralists Support',
      code: 'SC-3.1',
      description: 'Support for Gujjar-Bakerwal and other pastoralist communities including wool marketing and livelihood support',
      sortOrder: 1,
      componentId: comp3.id,
    },
  });

  const sc32 = await prisma.subComponent.upsert({
    where: { code: 'SC-3.2' },
    update: {},
    create: {
      name: 'Other Vulnerable Groups',
      code: 'SC-3.2',
      description: 'Support for BPL households, SC/ST communities and other marginalized groups',
      sortOrder: 2,
      componentId: comp3.id,
    },
  });

  const sc33 = await prisma.subComponent.upsert({
    where: { code: 'SC-3.3' },
    update: {},
    create: {
      name: 'Youth Support and Employment',
      code: 'SC-3.3',
      description: 'Youth clubs, skill development, and employment linkages for rural youth',
      sortOrder: 3,
      componentId: comp3.id,
    },
  });

  const vulSchemes = [
    { title: 'Wool marketing and price improvement support', code: 'SC31-WOOL', sub: sc31.id },
    { title: 'Livestock health and productivity support', code: 'SC31-LIVE', sub: sc31.id },
    { title: 'Pastureland development support', code: 'SC31-PAST', sub: sc31.id },
    { title: 'Vulnerable community enterprise development', code: 'SC32-VUL', sub: sc32.id },
    { title: 'BPL household livelihood support', code: 'SC32-BPL', sub: sc32.id },
    { title: 'Women self-help group support', code: 'SC32-SHG', sub: sc32.id },
    { title: 'Youth club formation and support', code: 'SC33-CLUB', sub: sc33.id },
    { title: 'Youth skill development training', code: 'SC33-SKILL', sub: sc33.id },
    { title: 'Rural youth employment linkage', code: 'SC33-EMP', sub: sc33.id },
  ];

  for (const s of vulSchemes) {
    await prisma.scheme.upsert({
      where: { code: s.code },
      update: {},
      create: {
        title: s.title, code: s.code,
        department: 'Rural Development', status: 'ACTIVE',
        budget: 0, utilizedBudget: 0,
        targetBeneficiaries: 0, achievedBeneficiaries: 0,
        subComponentId: s.sub,
      },
    });
  }
  console.log('\n✅ Component 3: Support to Vulnerable Communities');
  console.log(`   ${vulSchemes.length} schemes across SC-3.1, SC-3.2, SC-3.3`);

  // Summary
  const totalComponents = await prisma.component.count();
  const totalSubComponents = await prisma.subComponent.count();
  const totalSchemes = await prisma.scheme.count();
  console.log(`\n🎉 Component structure complete!`);
  console.log(`   Components    : ${totalComponents}`);
  console.log(`   Sub-components: ${totalSubComponents}`);
  console.log(`   Total schemes : ${totalSchemes}`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
