// prisma/seed.js  —  JKCIP MIS Full Logframe Seed
// Run with: node prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcryptjs = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding JKCIP MIS database...\n');

  // ─── 1. Admin User ────────────────────────────────────────────────────────
  const hashedPassword = await bcryptjs.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jkcip.com' },
    update: { password: hashedPassword, role: 'SUPER_ADMIN', status: 'ACTIVE' },
    create: {
      email: 'admin@jkcip.com',
      password: hashedPassword,
      fullName: 'System Administrator',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      department: 'PMU',
    },
  });
  console.log(`✅ Admin user: ${admin.email}`);

  // ─── Helper ───────────────────────────────────────────────────────────────
  async function ind(data) {
    return prisma.indicator.upsert({
      where: { code: data.code },
      update: {},
      create: {
        code: data.code,
        name: data.name,
        unit: data.unit || null,
        baseline: data.baseline || null,
        midTarget: data.midTarget || null,
        endTarget: data.endTarget || null,
        frequency: data.frequency || 'ANNUAL',
        source: data.source || 'MIS',
        responsibility: data.responsibility || 'PMU',
        department: data.department || null,
        crop: data.crop || null,
        active: true,
        supportsGenderBreakdown: data.gender || false,
        supportsYouthBreakdown: data.youth || false,
        supportsIndigenousBreakdown: data.indigenous || false,
        supportsHouseholdBreakdown: data.household || false,
        supportsDistrictBreakdown: false,
        supportsBlockBreakdown: false,
        logframeNodeId: data.nodeId,
      },
    });
  }

  async function node(data) {
    return prisma.logframeNode.upsert({
      where: { code: data.code },
      update: {},
      create: {
        title: data.title,
        code: data.code,
        level: data.level,
        description: data.description || null,
        sortOrder: data.order,
        active: true,
        parentId: data.parentId || null,
      },
    });
  }

  const MIS = 'MIS';
  const MIS_SURVEY = 'MIS, Baseline survey, mid-term survey';
  const SURVEY = 'Baseline survey, mid-term survey';
  const PMU = 'PMU';
  const PMU_EXT = 'PMU/External agency';
  const MNE = 'M&E and KM Manager';
  const MNE_SRC = 'M&E data (Results Framework)';
  const ANNUAL = 'ANNUAL';
  const MONTHLY = 'MONTHLY';
  const END = 'END_TERM';

  // ─── OUTREACH ─────────────────────────────────────────────────────────────
  const outreach = await node({ title: 'Project Outreach', code: 'OUTREACH', level: 'OUTREACH', order: 1, description: 'Total persons reached by project-supported activities' });
  await ind({ code: 'OR-1-M',   name: 'Persons reached - Males',                          unit: 'People',     midTarget: 79500,   endTarget: 159000,  source: MNE_SRC, responsibility: MNE, gender: true,    nodeId: outreach.id });
  await ind({ code: 'OR-1-F',   name: 'Persons reached - Females',                        unit: 'People',     midTarget: 70500,   endTarget: 141000,  source: MNE_SRC, responsibility: MNE, gender: true,    nodeId: outreach.id });
  await ind({ code: 'OR-1-Y',   name: 'Persons reached - Youth',                          unit: 'People',     midTarget: 45000,   endTarget: 90000,   source: MNE_SRC, responsibility: MNE, youth: true,     nodeId: outreach.id });
  await ind({ code: 'OR-1-I',   name: 'Persons reached - Indigenous people',              unit: 'People',     midTarget: 15000,   endTarget: 30000,   source: MNE_SRC, responsibility: MNE, indigenous: true, nodeId: outreach.id });
  await ind({ code: 'OR-1-T',   name: 'Total persons receiving services',                 unit: 'People',     midTarget: 150000,  endTarget: 300000,  source: MNE_SRC, responsibility: MNE, nodeId: outreach.id });
  await ind({ code: 'OR-1-MP',  name: 'Male - Percentage of reach',                       unit: '%',          midTarget: 53,      endTarget: 53,      nodeId: outreach.id });
  await ind({ code: 'OR-1-FP',  name: 'Female - Percentage of reach',                    unit: '%',          midTarget: 47,      endTarget: 47,      nodeId: outreach.id });
  await ind({ code: 'OR-1-YP',  name: 'Youth - Percentage of reach',                     unit: '%',          midTarget: 30,      endTarget: 30,      nodeId: outreach.id });
  await ind({ code: 'OR-1B-HM', name: '1.b Estimated household members reached',          unit: 'People',     midTarget: 765000,  endTarget: 1530000, household: true, nodeId: outreach.id });
  await ind({ code: 'OR-1A-WH', name: '1.a Women-headed households reached',              unit: 'Households', midTarget: 13500,   endTarget: 27000,   household: true, nodeId: outreach.id });
  await ind({ code: 'OR-1A-NH', name: '1.a Non-women-headed households reached',          unit: 'Households', midTarget: 136500,  endTarget: 273000,  nodeId: outreach.id });
  await ind({ code: 'OR-1A-TH', name: '1.a Total households reached',                    unit: 'Households', midTarget: 150000,  endTarget: 300000,  household: true, nodeId: outreach.id });
  console.log('✅ OUTREACH — 12 indicators');

  // ─── GOAL ─────────────────────────────────────────────────────────────────
  const goal = await node({ title: 'Project Goal: Contribute to the sustained increase in incomes of farming households', code: 'GOAL', level: 'GOAL', order: 2 });
  await ind({ code: 'GL-1', name: 'Households with >70% increase in income',                              unit: '%', midTarget: 30, endTarget: 70, source: SURVEY, frequency: END, responsibility: PMU_EXT, household: true, nodeId: goal.id });
  await ind({ code: 'GL-2', name: 'CI 1.2.4 - Households with >30% increase in production (niche crops)', unit: '%', midTarget: 30, endTarget: 70, source: SURVEY, frequency: END, responsibility: PMU_EXT, nodeId: goal.id });
  await ind({ code: 'GL-3', name: 'Households with >15% increase in productivity (niche & horticulture)',  unit: '%', midTarget: 35, endTarget: 80, source: SURVEY, frequency: END, responsibility: PMU_EXT, nodeId: goal.id });
  console.log('✅ GOAL — 3 indicators');

  // ─── DEVELOPMENT OBJECTIVE ────────────────────────────────────────────────
  const devObj = await node({ title: 'Development Objective: Improve the competitiveness of the farming sector in J&K', code: 'DEV-OBJ', level: 'DEVELOPMENT_OBJECTIVE', order: 3 });
  await ind({ code: 'DO-SAFF-P', name: 'Saffron productivity',        unit: 'Kg/ha',  baseline: 4,    midTarget: 4.5, endTarget: 5.5,  source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Saffron',        nodeId: devObj.id });
  await ind({ code: 'DO-CHIL-P', name: 'Kashmiri Chilli productivity', unit: 'Kg/ha',  baseline: 5000, midTarget: 6000,endTarget: 7500,  source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Kashmiri Chilli', nodeId: devObj.id });
  await ind({ code: 'DO-APPL-P', name: 'Apple productivity',           unit: 'MT/Ha',  baseline: 12,   midTarget: 14,  endTarget: 16,   source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Apple',          nodeId: devObj.id });
  await ind({ code: 'DO-WALN-P', name: 'Walnut productivity',          unit: 'MT/Ha',  baseline: 3,    midTarget: 3.5, endTarget: 4,    source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Walnut',         nodeId: devObj.id });
  await ind({ code: 'DO-MANG-P', name: 'Mango productivity',           unit: 'MT/Ha',  baseline: 2.5,  midTarget: 3.5, endTarget: 4.5,  source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Mango',          nodeId: devObj.id });
  await ind({ code: 'DO-CITR-P', name: 'Citrus productivity',          unit: 'MT/Ha',  baseline: 2.5,  midTarget: 3.5, endTarget: 4.5,  source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Citrus',         nodeId: devObj.id });
  await ind({ code: 'DO-STON-P', name: 'Stone fruits productivity',    unit: 'MT/Ha',  baseline: 3.8,  midTarget: 4.5, endTarget: 5.5,  source: SURVEY, frequency: END, responsibility: PMU_EXT, crop: 'Stone Fruits',   nodeId: devObj.id });
  await ind({ code: 'DO-SAFF-A', name: 'Saffron marketed as A-grade',        unit: '%', baseline: 0,  midTarget: 70, endTarget: 95, frequency: END, responsibility: PMU_EXT, crop: 'Saffron',        nodeId: devObj.id });
  await ind({ code: 'DO-VEGE-A', name: 'Vegetables marketed as A-grade',     unit: '%', baseline: 0,  midTarget: 50, endTarget: 65, frequency: END, responsibility: PMU_EXT, crop: 'Vegetables',     nodeId: devObj.id });
  await ind({ code: 'DO-CHIL-A', name: 'Kashmiri Chilli marketed as A-grade',unit: '%', baseline: 0,  midTarget: 50, endTarget: 65, frequency: END, responsibility: PMU_EXT, crop: 'Kashmiri Chilli', nodeId: devObj.id });
  await ind({ code: 'DO-APPL-A', name: 'Apple marketed as A-grade',          unit: '%', baseline: 40, midTarget: 45, endTarget: 60, frequency: END, responsibility: PMU_EXT, crop: 'Apple',          nodeId: devObj.id });
  await ind({ code: 'DO-STON-A', name: 'Stone fruits marketed as A-grade',   unit: '%', baseline: 30, midTarget: 35, endTarget: 45, frequency: END, responsibility: PMU_EXT, crop: 'Stone Fruits',   nodeId: devObj.id });
  await ind({ code: 'DO-MANG-A', name: 'Mango marketed as A-grade',          unit: '%', baseline: 20, midTarget: 25, endTarget: 30, frequency: END, responsibility: PMU_EXT, crop: 'Mango',          nodeId: devObj.id });
  await ind({ code: 'DO-CITR-A', name: 'Citrus marketed as A-grade',         unit: '%', baseline: 20, midTarget: 25, endTarget: 30, frequency: END, responsibility: PMU_EXT, crop: 'Citrus',         nodeId: devObj.id });
  console.log('✅ DEVELOPMENT OBJECTIVE — 14 indicators');

  // ─── OUTCOME 1 ────────────────────────────────────────────────────────────
  const oc1 = await node({ title: 'Outcome 1: Expansion and improved performance of Rural Financial Services and Value Chains', code: 'OC-1', level: 'OUTCOME', order: 4 });
  await ind({ code: 'OC1-221-M',  name: '2.2.1 Persons with new jobs - Males',              unit: 'People', midTarget: 1595, endTarget: 3190,  source: MIS_SURVEY, responsibility: PMU_EXT, gender: true,    nodeId: oc1.id });
  await ind({ code: 'OC1-221-F',  name: '2.2.1 Persons with new jobs - Females',            unit: 'People', midTarget: 1415, endTarget: 2830,  source: MIS_SURVEY, responsibility: PMU_EXT, gender: true,    nodeId: oc1.id });
  await ind({ code: 'OC1-221-I',  name: '2.2.1 Persons with new jobs - Indigenous',         unit: 'People', midTarget: 625,  endTarget: 1250,  source: MIS_SURVEY, responsibility: PMU_EXT, indigenous: true, nodeId: oc1.id });
  await ind({ code: 'OC1-221-Y',  name: '2.2.1 Persons with new jobs - Youth',              unit: 'People', midTarget: 900,  endTarget: 1805,  source: MIS_SURVEY, responsibility: PMU_EXT, youth: true,     nodeId: oc1.id });
  await ind({ code: 'OC1-221-T',  name: '2.2.1 Total persons with new jobs',                unit: 'People', midTarget: 3010, endTarget: 6020,  source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc1.id });
  await ind({ code: 'OC1-221-D',  name: '2.2.1 Persons with disabilities - new jobs',       unit: 'Number', midTarget: 36,   endTarget: 72,    source: MIS,        responsibility: PMU_EXT, nodeId: oc1.id });
  await ind({ code: 'OC1-224-PO', name: '2.2.4 Rural POs providing new/improved services',  unit: 'Organizations', baseline: 56, midTarget: 70, endTarget: 101, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc1.id });
  await ind({ code: 'OC1-224-TM', name: '2.2.4 Total PO members',                           unit: 'People', baseline: 16800, midTarget: 21000, endTarget: 30300, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc1.id });
  await ind({ code: 'OC1-224-MM', name: '2.2.4 Male PO members',                            unit: 'People', baseline: 8904,  midTarget: 11130, endTarget: 16059, source: MIS,        responsibility: PMU_EXT, gender: true, nodeId: oc1.id });
  await ind({ code: 'OC1-224-FM', name: '2.2.4 Female PO members',                          unit: 'People', baseline: 7896,  midTarget: 9870,  endTarget: 14241, source: MIS,        responsibility: PMU_EXT, gender: true, nodeId: oc1.id });
  await ind({ code: 'OC1-224-YM', name: '2.2.4 Young PO members',                           unit: 'People', baseline: 5040,  midTarget: 6300,  endTarget: 9090,  source: MIS,        responsibility: PMU_EXT, youth: true,  nodeId: oc1.id });
  await ind({ code: 'OC1-225',    name: '2.2.5 Rural POs reporting increase in sales',       unit: '%',      midTarget: 30,   endTarget: 70,    source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc1.id });
  const op11 = await node({ title: 'Output 1.1: Scaling up collectivization of smallholder farmers', code: 'OP-1.1', level: 'OUTPUT', order: 5, parentId: oc1.id });
  await ind({ code: 'OP11-FPO',  name: 'No. of FPOs supported',                                              unit: 'Number', midTarget: 50,    endTarget: 101,  source: MIS, frequency: MONTHLY, nodeId: op11.id });
  await ind({ code: 'OP11-214',  name: '2.1.4 Rural producers as members of a producers organization',       unit: 'People', midTarget: 15000, endTarget: 30300, source: MIS, frequency: MONTHLY, nodeId: op11.id });
  console.log('✅ OUTCOME 1 + Output 1.1 — 14 indicators');

  // ─── OUTCOME 2 ────────────────────────────────────────────────────────────
  const oc2 = await node({ title: 'Outcome 2: Enhanced productivity and production (niche and horticultural crops)', code: 'OC-2', level: 'OUTCOME', order: 6 });
  await ind({ code: 'OC2-322-HM',  name: '3.2.2 HH members adopting environmentally sustainable practices', unit: 'People',      midTarget: 4500, endTarget: 21210, source: MIS_SURVEY, responsibility: PMU_EXT, household: true, nodeId: oc2.id });
  await ind({ code: 'OC2-322-PCT', name: '3.2.2 Households adopting sustainable practices (%)',              unit: '%',           midTarget: 30,   endTarget: 70,    source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc2.id });
  await ind({ code: 'OC2-322-HH',  name: '3.2.2 Households adopting sustainable practices (number)',         unit: 'Households',  midTarget: 4500, endTarget: 21210, source: MIS_SURVEY, responsibility: PMU_EXT, household: true, nodeId: oc2.id });
  await ind({ code: 'OC2-NICHE',   name: 'Area expansion under niche crops',                                 unit: 'Hectares',    midTarget: 1403, endTarget: 2805,  source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc2.id });
  await ind({ code: 'OC2-HORT',    name: 'Area expansion under horticultural crops',                          unit: 'Hectares',    midTarget: 773,  endTarget: 1545,  source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc2.id });
  const op21 = await node({ title: 'Output 2.1: GAP training for niche and horticultural crop farmers', code: 'OP-2.1', level: 'OUTPUT', order: 7, parentId: oc2.id });
  await ind({ code: 'OP21-GAP', name: 'No. of farmers trained in GAP (niche and horticultural crops)', unit: 'Farmers', midTarget: 16200, endTarget: 32400, source: MIS, frequency: MONTHLY, nodeId: op21.id });
  const op22 = await node({ title: 'Output 2.2: Access to inputs/technology packages', code: 'OP-2.2', level: 'OUTPUT', order: 8, parentId: oc2.id });
  await ind({ code: 'OP22-113-M', name: '1.1.3 Rural producers accessing production inputs - Males',   unit: 'People',   midTarget: 8029,  endTarget: 16059, source: MIS, frequency: MONTHLY, gender: true, nodeId: op22.id });
  await ind({ code: 'OP22-113-F', name: '1.1.3 Rural producers accessing production inputs - Females', unit: 'People',   midTarget: 7121,  endTarget: 14241, source: MIS, frequency: MONTHLY, gender: true, nodeId: op22.id });
  await ind({ code: 'OP22-113-Y', name: '1.1.3 Rural producers accessing production inputs - Youth',   unit: 'People',   midTarget: 4545,  endTarget: 9090,  source: MIS, frequency: MONTHLY, youth: true,  nodeId: op22.id });
  await ind({ code: 'OP22-113-T', name: '1.1.3 Total rural producers accessing production inputs',     unit: 'People',   midTarget: 15150, endTarget: 30300, source: MIS, frequency: MONTHLY, nodeId: op22.id });
  await ind({ code: 'OP22-314',   name: '3.1.4 Land brought under climate-resilient practices',        unit: 'Hectares', midTarget: 773,   endTarget: 1545,  source: MIS, frequency: MONTHLY, nodeId: op22.id });
  const op23 = await node({ title: 'Output 2.3: Water management systems established', code: 'OP-2.3', level: 'OUTPUT', order: 9, parentId: oc2.id });
  await ind({ code: 'OP23-WMS', name: 'No. of water management systems established', unit: 'Number', midTarget: 675, endTarget: 1350, source: MIS, frequency: MONTHLY, nodeId: op23.id });
  const op24 = await node({ title: 'Output 2.4: Nurseries established', code: 'OP-2.4', level: 'OUTPUT', order: 10, parentId: oc2.id });
  await ind({ code: 'OP24-NUR', name: 'No. of nurseries established', unit: 'Number', midTarget: 160, endTarget: 320, source: MIS, frequency: MONTHLY, nodeId: op24.id });
  console.log('✅ OUTCOME 2 + Outputs 2.1-2.4 — 13 indicators');

  // ─── OUTCOME 3 ────────────────────────────────────────────────────────────
  const oc3 = await node({ title: 'Outcome 3: Improved price realization of Agri and allied sector produce', code: 'OC-3', level: 'OUTCOME', order: 11 });
  await ind({ code: 'OC3-FGP',  name: '% of farmers reporting increase in farm gate prices',       unit: '%', midTarget: 30, endTarget: 70, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc3.id });
  await ind({ code: 'OC3-222',  name: '2.2.2 Rural enterprises reporting increase in profit (%)',  unit: '%', midTarget: 30, endTarget: 70, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc3.id });
  await ind({ code: 'OC3-MKT',  name: '% of enterprises with improved market linkages',            unit: '%', midTarget: 30, endTarget: 70, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc3.id });
  await ind({ code: 'OC3-YUTH', name: '% of start-ups supported with youth ownership',             unit: '%', midTarget: 30, endTarget: 60, source: MIS_SURVEY, responsibility: PMU_EXT, youth: true, nodeId: oc3.id });
  const op31 = await node({ title: 'Output 3.1: Enterprise promotion', code: 'OP-3.1', level: 'OUTPUT', order: 12, parentId: oc3.id });
  await ind({ code: 'OP31-ENT',   name: 'Number of enterprises supported',                              unit: 'Number', midTarget: 602, endTarget: 1204, source: MIS, frequency: MONTHLY, nodeId: op31.id });
  await ind({ code: 'OP31-212-M', name: '2.1.2 Persons trained in IGA/Business Management - Males',    unit: 'People', midTarget: 319, endTarget: 638,  source: MIS, frequency: MONTHLY, gender: true, nodeId: op31.id });
  await ind({ code: 'OP31-212-F', name: '2.1.2 Persons trained in IGA/Business Management - Females',  unit: 'People', midTarget: 283, endTarget: 566,  source: MIS, frequency: MONTHLY, gender: true, nodeId: op31.id });
  await ind({ code: 'OP31-212-Y', name: '2.1.2 Persons trained in IGA/Business Management - Youth',    unit: 'People', midTarget: 180, endTarget: 361,  source: MIS, frequency: MONTHLY, youth: true,  nodeId: op31.id });
  await ind({ code: 'OP31-212-T', name: '2.1.2 Total persons trained in IGA or Business Management',   unit: 'People', midTarget: 602, endTarget: 1204, source: MIS, frequency: MONTHLY, nodeId: op31.id });
  const op32 = await node({ title: 'Output 3.2: Market promotion', code: 'OP-3.2', level: 'OUTPUT', order: 13, parentId: oc3.id });
  await ind({ code: 'OP32-MSP', name: 'Number of Market Stakeholder Platform (MSP) meetings conducted', unit: 'Number', midTarget: 6,  endTarget: 12, source: MIS, frequency: MONTHLY, nodeId: op32.id });
  await ind({ code: 'OP32-BSM', name: 'Number of Buyer-Seller meets conducted',                         unit: 'Number', midTarget: 14, endTarget: 28, source: MIS, frequency: MONTHLY, nodeId: op32.id });
  const op33 = await node({ title: 'Output 3.3: Incubation and start-up support', code: 'OP-3.3', level: 'OUTPUT', order: 14, parentId: oc3.id });
  await ind({ code: 'OP33-SEED',  name: 'Number of start-ups supported with seed funds',    unit: 'Number', midTarget: 175, endTarget: 350, source: MIS, frequency: MONTHLY, youth: true, nodeId: op33.id });
  await ind({ code: 'OP33-SCALE', name: 'Number of start-ups accessing scale-up funds',     unit: 'Number', midTarget: 60,  endTarget: 120, source: MIS, frequency: MONTHLY, nodeId: op33.id });
  console.log('✅ OUTCOME 3 + Outputs 3.1-3.3 — 13 indicators');

  // ─── OUTCOME 4 ────────────────────────────────────────────────────────────
  const oc4 = await node({ title: 'Outcome 4: Improved resilience of vulnerable groups (pastoralists, youth, indigenous people)', code: 'OC-4', level: 'OUTCOME', order: 15 });
  await ind({ code: 'OC4-WOOL', name: '% of pastoralists reporting improvements in wool prices',           unit: '%', baseline: 0, midTarget: 25, endTarget: 50, source: MIS_SURVEY, responsibility: PMU_EXT, nodeId: oc4.id });
  await ind({ code: 'OC4-LIV',  name: '% of vulnerable HHs reporting livelihood diversification',         unit: '%', baseline: 0, midTarget: 15, endTarget: 30, source: MIS_SURVEY, responsibility: PMU_EXT, household: true, nodeId: oc4.id });
  await ind({ code: 'OC4-YUTH', name: '% of youth clubs participating in community action (environment)',  unit: '%', baseline: 0, midTarget: 30, endTarget: 60, source: MIS_SURVEY, responsibility: PMU_EXT, youth: true,     nodeId: oc4.id });
  const op41 = await node({ title: 'Output 4.1: Pastoralists support', code: 'OP-4.1', level: 'OUTPUT', order: 16, parentId: oc4.id });
  await ind({ code: 'OP41-WOOL', name: '% of pastoralists reporting improvements in wool price', unit: '%', midTarget: 25, endTarget: 50, source: MIS, frequency: MONTHLY, nodeId: op41.id });
  const op42 = await node({ title: 'Output 4.2: Support to other vulnerable groups', code: 'OP-4.2', level: 'OUTPUT', order: 17, parentId: oc4.id });
  await ind({ code: 'OP42-VUL',  name: 'No. of persons from vulnerable communities supported for enterprise development', unit: 'Number', midTarget: 625,  endTarget: 1250, source: MIS, frequency: MONTHLY, indigenous: true, nodeId: op42.id });
  await ind({ code: 'OP42-CLUB', name: 'Number of youth clubs supported',                                                unit: 'Number', midTarget: 1300, endTarget: 2700, source: MIS, frequency: MONTHLY, youth: true,      nodeId: op42.id });
  console.log('✅ OUTCOME 4 + Outputs 4.1-4.2 — 6 indicators');

  // ─── OUTCOME 5 ────────────────────────────────────────────────────────────
  const oc5 = await node({ title: 'Outcome 5: Project Management systems strengthened and knowledge management improved', code: 'OC-5', level: 'OUTCOME', order: 18 });
  await ind({ code: 'OC5-SF21-HM',  name: 'SF.2.1 Household members satisfied with project services',            unit: 'People',     midTarget: 52500, endTarget: 105000, responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  await ind({ code: 'OC5-SF21-IH',  name: 'SF.2.1 Indigenous households satisfied with project services',        unit: 'Households', midTarget: 5250,  endTarget: 21000,  responsibility: PMU_EXT, indigenous: true,  nodeId: oc5.id });
  await ind({ code: 'OC5-SF21-WH',  name: 'SF.2.1 Women-headed households satisfied with project services',      unit: 'Households', midTarget: 4725,  endTarget: 18900,  responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  await ind({ code: 'OC5-SF21-PCT', name: 'SF.2.1 Households satisfied with project services (%)',               unit: '%',          midTarget: 35,    endTarget: 70,     responsibility: PMU_EXT, nodeId: oc5.id });
  await ind({ code: 'OC5-SF21-TH',  name: 'SF.2.1 Total households satisfied with project services',             unit: 'Households', midTarget: 52500, endTarget: 105000, responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  await ind({ code: 'OC5-SF22-HM',  name: 'SF.2.2 HH members reporting influence on local authority decisions',  unit: 'People',     midTarget: 52500, endTarget: 105000, responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  await ind({ code: 'OC5-SF22-IH',  name: 'SF.2.2 Indigenous households reporting influence on decisions',       unit: 'Households', midTarget: 5250,  endTarget: 21000,  responsibility: PMU_EXT, indigenous: true,  nodeId: oc5.id });
  await ind({ code: 'OC5-SF22-WH',  name: 'SF.2.2 Women-headed households reporting influence on decisions',     unit: 'Households', midTarget: 4725,  endTarget: 18900,  responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  await ind({ code: 'OC5-SF22-PCT', name: 'SF.2.2 Households reporting influence on local authority decisions (%)' , unit: '%', midTarget: 35, endTarget: 70, responsibility: PMU_EXT, nodeId: oc5.id });
  await ind({ code: 'OC5-SF22-TH',  name: 'SF.2.2 Total households reporting influence on decisions',            unit: 'Households', midTarget: 52500, endTarget: 105000, responsibility: PMU_EXT, household: true,   nodeId: oc5.id });
  const op51 = await node({ title: 'Output 5.1: Policy engagement and knowledge management', code: 'OP-5.1', level: 'OUTPUT', order: 19, parentId: oc5.id });
  await ind({ code: 'OP51-STU', name: 'Policy studies conducted',   unit: 'Number', midTarget: 2, endTarget: 4, source: MIS, frequency: MONTHLY, nodeId: op51.id });
  await ind({ code: 'OP51-WRK', name: 'Policy workshops conducted', unit: 'Number', midTarget: 2, endTarget: 4, source: MIS, frequency: MONTHLY, nodeId: op51.id });
  const op52 = await node({ title: 'Output 5.2: Staff training of Agri and allied sector departments', code: 'OP-5.2', level: 'OUTPUT', order: 20, parentId: oc5.id });
  await ind({ code: 'OP52-STAFF', name: '100% recruitment of agreed human resources (positions in place)', unit: '%', midTarget: 100, endTarget: 100, source: MIS, frequency: MONTHLY, nodeId: op52.id });
  console.log('✅ OUTCOME 5 + Outputs 5.1-5.2 — 13 indicators');

  // ─── Summary ──────────────────────────────────────────────────────────────
  const totalIndicators = await prisma.indicator.count();
  const totalNodes = await prisma.logframeNode.count();
  console.log(`\n🎉 Seed complete!`);
  console.log(`   Logframe nodes : ${totalNodes}`);
  console.log(`   Total indicators: ${totalIndicators}`);
  console.log(`   Login: admin@jkcip.com / 123456`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
