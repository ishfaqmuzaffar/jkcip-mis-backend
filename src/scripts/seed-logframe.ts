import { PrismaClient } from '@prisma/client';
import * as seed from '../logframe/data/jkcip-logframe.seed.json';

type SeedNode = {
  code: string;
  title: string;
  level: string;
  description?: string | null;
  parentCode?: string | null;
  sortOrder?: number;
};

type SeedProgress = {
  reportYear: number;
  annualTarget?: number | null;
  annualResult?: number | null;
  cumulativeResult?: number | null;
};

type SeedIndicator = {
  code: string;
  name: string;
  description?: string | null;
  unit?: string | null;
  baseline?: number | null;
  midTarget?: number | null;
  endTarget?: number | null;
  frequency?: string;
  source?: string | null;
  responsibility?: string | null;
  active?: boolean;
  supportsGenderBreakdown?: boolean;
  supportsYouthBreakdown?: boolean;
  supportsIndigenousBreakdown?: boolean;
  supportsHouseholdBreakdown?: boolean;
  supportsBlockBreakdown?: boolean;
  logframeNodeCode: string;
  progress?: SeedProgress[];
};

const prisma: any = new PrismaClient();

async function main() {
  const nodeMap = new Map<string, number>();
  const nodes = (seed as any).nodes as SeedNode[];
  const indicators = (seed as any).indicators as SeedIndicator[];

  for (const node of nodes) {
    const parentId = node.parentCode ? nodeMap.get(node.parentCode) : undefined;

    const saved = await prisma.logframeNode.upsert({
      where: { code: node.code },
      update: {
        title: node.title,
        level: node.level,
        description: node.description ?? undefined,
        sortOrder: node.sortOrder ?? 0,
        active: true,
        parentId,
      },
      create: {
        title: node.title,
        code: node.code,
        level: node.level,
        description: node.description ?? undefined,
        sortOrder: node.sortOrder ?? 0,
        active: true,
        parentId,
      },
    });

    nodeMap.set(node.code, saved.id);
  }

  for (const indicator of indicators) {
    const logframeNodeId = nodeMap.get(indicator.logframeNodeCode);
    if (!logframeNodeId) continue;

    const saved = await prisma.indicator.upsert({
      where: { code: indicator.code },
      update: {
        name: indicator.name,
        description: indicator.description ?? undefined,
        unit: indicator.unit ?? undefined,
        baseline: indicator.baseline ?? undefined,
        midTarget: indicator.midTarget ?? undefined,
        endTarget: indicator.endTarget ?? undefined,
        frequency: indicator.frequency || 'ANNUAL',
        source: indicator.source ?? undefined,
        responsibility: indicator.responsibility ?? undefined,
        active: indicator.active ?? true,
        supportsGenderBreakdown: indicator.supportsGenderBreakdown ?? false,
        supportsYouthBreakdown: indicator.supportsYouthBreakdown ?? false,
        supportsIndigenousBreakdown: indicator.supportsIndigenousBreakdown ?? false,
        supportsHouseholdBreakdown: indicator.supportsHouseholdBreakdown ?? false,
        supportsBlockBreakdown: indicator.supportsBlockBreakdown ?? false,
        logframeNodeId,
      },
      create: {
        code: indicator.code,
        name: indicator.name,
        description: indicator.description ?? undefined,
        unit: indicator.unit ?? undefined,
        baseline: indicator.baseline ?? undefined,
        midTarget: indicator.midTarget ?? undefined,
        endTarget: indicator.endTarget ?? undefined,
        frequency: indicator.frequency || 'ANNUAL',
        source: indicator.source ?? undefined,
        responsibility: indicator.responsibility ?? undefined,
        active: indicator.active ?? true,
        supportsGenderBreakdown: indicator.supportsGenderBreakdown ?? false,
        supportsYouthBreakdown: indicator.supportsYouthBreakdown ?? false,
        supportsIndigenousBreakdown: indicator.supportsIndigenousBreakdown ?? false,
        supportsHouseholdBreakdown: indicator.supportsHouseholdBreakdown ?? false,
        supportsBlockBreakdown: indicator.supportsBlockBreakdown ?? false,
        logframeNodeId,
      },
    });

    if (indicator.progress?.length) {
      for (const row of indicator.progress) {
        await prisma.indicatorYearProgress.upsert({
          where: {
            indicatorId_reportYear_district_block_village: {
              indicatorId: saved.id,
              reportYear: row.reportYear,
              district: null,
              block: null,
              village: null,
            },
          },
          update: {
            annualTarget: row.annualTarget ?? undefined,
            annualResult: row.annualResult ?? undefined,
            cumulativeResult: row.cumulativeResult ?? undefined,
          },
          create: {
            indicatorId: saved.id,
            reportYear: row.reportYear,
            annualTarget: row.annualTarget ?? undefined,
            annualResult: row.annualResult ?? undefined,
            cumulativeResult: row.cumulativeResult ?? undefined,
          },
        });
      }
    }
  }

  console.log(`Seeded ${nodes.length} logframe nodes and ${indicators.length} indicators.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
