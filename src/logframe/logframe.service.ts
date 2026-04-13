import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { CreateLogframeNodeDto } from './dto/create-logframe-node.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { UpdateLogframeNodeDto } from './dto/update-logframe-node.dto';
import { UpsertIndicatorProgressDto } from './dto/upsert-indicator-progress.dto';

@Injectable()
export class LogframeService {
  constructor(private readonly prisma: PrismaService) {}

  async getTree() {
    const nodes = await (this.prisma as any).logframeNode.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        indicators: {
          where: { active: true },
          orderBy: { code: 'asc' },
          include: {
            yearlyProgress: {
              orderBy: { reportYear: 'asc' },
            },
          },
        },
      },
    });

    const map = new Map<number, any>();
    for (const node of nodes) {
      map.set(node.id, { ...node, children: [] });
    }

    const roots: any[] = [];
    for (const node of nodes) {
      const hydrated = map.get(node.id);
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId).children.push(hydrated);
      } else {
        roots.push(hydrated);
      }
    }

    return roots;
  }

  async getNodes() {
    return (this.prisma as any).logframeNode.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        parent: { select: { id: true, title: true, code: true, level: true } },
        _count: { select: { indicators: true, children: true } },
      },
    });
  }

  async createNode(dto: CreateLogframeNodeDto) {
    return (this.prisma as any).logframeNode.create({
      data: {
        title: dto.title,
        code: dto.code,
        level: dto.level,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
        parentId: dto.parentId,
      },
      include: {
        parent: { select: { id: true, title: true, code: true, level: true } },
      },
    });
  }

  async updateNode(id: number, dto: UpdateLogframeNodeDto) {
    await this.ensureNodeExists(id);
    return (this.prisma as any).logframeNode.update({
      where: { id },
      data: {
        title: dto.title,
        code: dto.code,
        level: dto.level,
        description: dto.description,
        sortOrder: dto.sortOrder,
        active: dto.active,
        parentId: dto.parentId,
      },
      include: {
        parent: { select: { id: true, title: true, code: true, level: true } },
      },
    });
  }

  async getIndicators(filters: {
    nodeId?: number;
    department?: string;
    sector?: string;
    crop?: string;
    year?: number;
  }) {
    const indicators = await (this.prisma as any).indicator.findMany({
      where: {
        ...(filters.nodeId ? { logframeNodeId: filters.nodeId } : {}),
        ...(filters.department ? { department: filters.department } : {}),
        ...(filters.sector ? { sector: filters.sector } : {}),
        ...(filters.crop ? { crop: filters.crop } : {}),
      },
      orderBy: [{ code: 'asc' }],
      include: {
        logframeNode: {
          select: { id: true, title: true, code: true, level: true, parentId: true },
        },
        yearlyProgress: {
          where: filters.year ? { reportYear: filters.year } : undefined,
          orderBy: [{ reportYear: 'asc' }, { district: 'asc' }],
        },
      },
    });

    return indicators.map((indicator) => this.decorateIndicator(indicator));
  }

  async getIndicator(id: number) {
    const indicator = await (this.prisma as any).indicator.findUnique({
      where: { id },
      include: {
        logframeNode: {
          include: {
            parent: { select: { id: true, title: true, code: true, level: true } },
          },
        },
        yearlyProgress: {
          orderBy: [{ reportYear: 'asc' }, { district: 'asc' }, { block: 'asc' }, { village: 'asc' }],
          include: {
            verifiedBy: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!indicator) {
      throw new NotFoundException('Indicator not found');
    }

    return this.decorateIndicator(indicator);
  }

  async createIndicator(dto: CreateIndicatorDto) {
    await this.ensureNodeExists(dto.logframeNodeId);

    const indicator = await (this.prisma as any).indicator.create({
      data: this.mapIndicatorData(dto),
      include: {
        logframeNode: {
          select: { id: true, title: true, code: true, level: true },
        },
        yearlyProgress: {
          orderBy: [{ reportYear: 'asc' }, { district: 'asc' }],
        },
      },
    });

    return this.decorateIndicator(indicator);
  }

  async updateIndicator(id: number, dto: UpdateIndicatorDto) {
    await this.ensureIndicatorExists(id);
    if (dto.logframeNodeId !== undefined) {
      await this.ensureNodeExists(dto.logframeNodeId);
    }

    const indicator = await (this.prisma as any).indicator.update({
      where: { id },
      data: this.mapIndicatorData(dto),
      include: {
        logframeNode: {
          select: { id: true, title: true, code: true, level: true },
        },
        yearlyProgress: {
          orderBy: [{ reportYear: 'asc' }, { district: 'asc' }],
        },
      },
    });

    return this.decorateIndicator(indicator);
  }

  async getIndicatorProgress(indicatorId: number, year?: number) {
    await this.ensureIndicatorExists(indicatorId);

    const rows = await (this.prisma as any).indicatorYearProgress.findMany({
      where: {
        indicatorId,
        ...(year ? { reportYear: year } : {}),
      },
      orderBy: [{ reportYear: 'asc' }, { district: 'asc' }, { block: 'asc' }, { village: 'asc' }],
      include: {
        verifiedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    return {
      indicatorId,
      rows,
      aggregated: this.aggregateProgressRows(rows),
    };
  }

  async upsertIndicatorProgress(indicatorId: number, dto: UpsertIndicatorProgressDto, verifiedById?: number) {
    await this.ensureIndicatorExists(indicatorId);

    const where = {
      indicatorId_reportYear_district_block_village: {
        indicatorId,
        reportYear: dto.reportYear,
        district: dto.district ?? null,
        block: dto.block ?? null,
        village: dto.village ?? null,
      },
    } as const;

    const row = await (this.prisma as any).indicatorYearProgress.upsert({
      where,
      create: {
        indicatorId,
        reportYear: dto.reportYear,
        annualTarget: dto.annualTarget,
        annualResult: dto.annualResult,
        cumulativeTarget: dto.cumulativeTarget,
        cumulativeResult: dto.cumulativeResult,
        maleValue: dto.maleValue,
        femaleValue: dto.femaleValue,
        youthValue: dto.youthValue,
        indigenousValue: dto.indigenousValue,
        householdValue: dto.householdValue,
        womenHeadedHouseholdValue: dto.womenHeadedHouseholdValue,
        bplValue: dto.bplValue,
        generalValue: dto.generalValue,
        district: dto.district,
        block: dto.block,
        village: dto.village,
        dimensionValues: dto.dimensionValues as Prisma.InputJsonValue | undefined,
        evidenceSource: dto.evidenceSource,
        remarks: dto.remarks,
        reportingMonth: dto.reportingMonth,
        lastReportedAt: dto.lastReportedAt ? new Date(dto.lastReportedAt) : new Date(),
        verifiedAt: verifiedById ? new Date() : undefined,
        verifiedById,
      },
      update: {
        annualTarget: dto.annualTarget,
        annualResult: dto.annualResult,
        cumulativeTarget: dto.cumulativeTarget,
        cumulativeResult: dto.cumulativeResult,
        maleValue: dto.maleValue,
        femaleValue: dto.femaleValue,
        youthValue: dto.youthValue,
        indigenousValue: dto.indigenousValue,
        householdValue: dto.householdValue,
        womenHeadedHouseholdValue: dto.womenHeadedHouseholdValue,
        bplValue: dto.bplValue,
        generalValue: dto.generalValue,
        district: dto.district,
        block: dto.block,
        village: dto.village,
        dimensionValues: dto.dimensionValues as Prisma.InputJsonValue | undefined,
        evidenceSource: dto.evidenceSource,
        remarks: dto.remarks,
        reportingMonth: dto.reportingMonth,
        lastReportedAt: dto.lastReportedAt ? new Date(dto.lastReportedAt) : new Date(),
        verifiedAt: verifiedById ? new Date() : undefined,
        verifiedById,
      },
      include: {
        verifiedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });

    const indicator = await (this.prisma as any).indicator.findUnique({
      where: { id: indicatorId },
      include: { yearlyProgress: { orderBy: { reportYear: 'asc' } } },
    });

    return {
      row,
      aggregated: this.aggregateProgressRows(indicator?.yearlyProgress ?? []),
    };
  }

  async getDashboardSummary(year?: number) {
    const indicatorWhere = year
      ? {
          yearlyProgress: {
            some: { reportYear: year },
          },
        }
      : {};

    const [totalNodes, totalIndicators, activeIndicators, progressRows, indicators] = await Promise.all([
      (this.prisma as any).logframeNode.count(),
      (this.prisma as any).indicator.count(),
      (this.prisma as any).indicator.count({ where: { active: true } }),
      (this.prisma as any).indicatorYearProgress.findMany({
        where: year ? { reportYear: year } : undefined,
      }),
      (this.prisma as any).indicator.findMany({
        where: indicatorWhere,
        include: {
          logframeNode: { select: { id: true, title: true, code: true, level: true } },
          yearlyProgress: {
            where: year ? { reportYear: year } : undefined,
          },
        },
      }),
    ]);

    const aggregated = this.aggregateProgressRows(progressRows);
    const achievedIndicators = indicators.filter((indicator) => {
      const latest = this.pickLatestProgress(indicator.yearlyProgress);
      const target = latest?.annualTarget ?? latest?.cumulativeTarget ?? indicator.endTarget ?? 0;
      const actual = latest?.annualResult ?? latest?.cumulativeResult ?? 0;
      return target > 0 && actual >= target;
    }).length;

    return {
      totalNodes,
      totalIndicators,
      activeIndicators,
      indicatorsWithData: indicators.length,
      achievedIndicators,
      achievementRate: this.toPercent(achievedIndicators, indicators.length),
      totals: aggregated,
      byLevel: this.buildLevelBreakdown(indicators),
    };
  }

  async getOutcomePerformance(year?: number) {
    const outcomes = await (this.prisma as any).logframeNode.findMany({
      where: { level: 'OUTCOME' as any },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        indicators: {
          include: {
            yearlyProgress: {
              where: year ? { reportYear: year } : undefined,
            },
          },
        },
        children: {
          include: {
            indicators: {
              include: {
                yearlyProgress: {
                  where: year ? { reportYear: year } : undefined,
                },
              },
            },
          },
        },
      },
    });

    return outcomes.map((outcome) => {
      const indicators = [...outcome.indicators, ...outcome.children.flatMap((child) => child.indicators)];
      const rows = indicators.flatMap((indicator) => indicator.yearlyProgress);
      const achieved = indicators.filter((indicator) => {
        const latest = this.pickLatestProgress(indicator.yearlyProgress);
        const target = latest?.annualTarget ?? latest?.cumulativeTarget ?? indicator.endTarget ?? 0;
        const actual = latest?.annualResult ?? latest?.cumulativeResult ?? 0;
        return target > 0 && actual >= target;
      }).length;

      return {
        id: outcome.id,
        code: outcome.code,
        title: outcome.title,
        indicators: indicators.length,
        achievedIndicators: achieved,
        achievementRate: this.toPercent(achieved, indicators.length),
        totals: this.aggregateProgressRows(rows),
      };
    });
  }

  private mapIndicatorData(dto: CreateIndicatorDto | UpdateIndicatorDto): any {
    const base = {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.baseline !== undefined ? { baseline: dto.baseline } : {}),
      ...(dto.midTarget !== undefined ? { midTarget: dto.midTarget } : {}),
      ...(dto.endTarget !== undefined ? { endTarget: dto.endTarget } : {}),
      ...(dto.frequency !== undefined ? { frequency: dto.frequency as any } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.responsibility !== undefined ? { responsibility: dto.responsibility } : {}),
      ...(dto.department !== undefined ? { department: dto.department } : {}),
      ...(dto.sector !== undefined ? { sector: dto.sector } : {}),
      ...(dto.crop !== undefined ? { crop: dto.crop } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.dimensionConfig !== undefined ? { dimensionConfig: dto.dimensionConfig as Prisma.InputJsonValue } : {}),
      ...(dto.supportsDistrictBreakdown !== undefined ? { supportsDistrictBreakdown: dto.supportsDistrictBreakdown } : {}),
      ...(dto.supportsBlockBreakdown !== undefined ? { supportsBlockBreakdown: dto.supportsBlockBreakdown } : {}),
      ...(dto.supportsGenderBreakdown !== undefined ? { supportsGenderBreakdown: dto.supportsGenderBreakdown } : {}),
      ...(dto.supportsYouthBreakdown !== undefined ? { supportsYouthBreakdown: dto.supportsYouthBreakdown } : {}),
      ...(dto.supportsIndigenousBreakdown !== undefined ? { supportsIndigenousBreakdown: dto.supportsIndigenousBreakdown } : {}),
      ...(dto.supportsHouseholdBreakdown !== undefined ? { supportsHouseholdBreakdown: dto.supportsHouseholdBreakdown } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    } as any;

    if ((dto as CreateIndicatorDto).logframeNodeId !== undefined) {
      base.logframeNode = { connect: { id: (dto as any).logframeNodeId } };
    }

    return base;
  }

  private decorateIndicator<T extends { yearlyProgress?: any[]; logframeNode?: any; endTarget?: number }>(indicator: T) {
    const latest = this.pickLatestProgress(indicator.yearlyProgress ?? []);
    const target = latest?.annualTarget ?? latest?.cumulativeTarget ?? indicator.endTarget ?? 0;
    const actual = latest?.annualResult ?? latest?.cumulativeResult ?? 0;

    return {
      ...indicator,
      progressPercent: this.toPercent(actual, target),
      gap: target > 0 ? Number((target - actual).toFixed(2)) : 0,
      latestProgress: latest ?? null,
    };
  }

  private aggregateProgressRows(rows: any[]) {
    const totals = rows.reduce(
      (acc, row) => {
        acc.annualTarget += row.annualTarget ?? 0;
        acc.annualResult += row.annualResult ?? 0;
        acc.cumulativeTarget += row.cumulativeTarget ?? 0;
        acc.cumulativeResult += row.cumulativeResult ?? 0;
        acc.maleValue += row.maleValue ?? 0;
        acc.femaleValue += row.femaleValue ?? 0;
        acc.youthValue += row.youthValue ?? 0;
        acc.indigenousValue += row.indigenousValue ?? 0;
        acc.householdValue += row.householdValue ?? 0;
        acc.womenHeadedHouseholdValue += row.womenHeadedHouseholdValue ?? 0;
        acc.bplValue += row.bplValue ?? 0;
        acc.generalValue += row.generalValue ?? 0;
        return acc;
      },
      {
        annualTarget: 0,
        annualResult: 0,
        cumulativeTarget: 0,
        cumulativeResult: 0,
        maleValue: 0,
        femaleValue: 0,
        youthValue: 0,
        indigenousValue: 0,
        householdValue: 0,
        womenHeadedHouseholdValue: 0,
        bplValue: 0,
        generalValue: 0,
      },
    );

    return {
      ...totals,
      annualAchievementPercent: this.toPercent(totals.annualResult, totals.annualTarget),
      cumulativeAchievementPercent: this.toPercent(totals.cumulativeResult, totals.cumulativeTarget),
    };
  }

  private buildLevelBreakdown(indicators: any[]) {
    const breakdown = new Map<string, { indicators: number; progressRows: any[] }>();

    for (const indicator of indicators) {
      const level = indicator.logframeNode?.level ?? 'UNKNOWN';
      if (!breakdown.has(level)) {
        breakdown.set(level, { indicators: 0, progressRows: [] });
      }
      const bucket = breakdown.get(level)!;
      bucket.indicators += 1;
      bucket.progressRows.push(...indicator.yearlyProgress);
    }

    return Array.from(breakdown.entries()).map(([level, value]) => ({
      level,
      indicators: value.indicators,
      totals: this.aggregateProgressRows(value.progressRows),
    }));
  }

  private pickLatestProgress(rows: any[]) {
    if (!rows || rows.length === 0) {
      return null;
    }

    return [...rows].sort((a, b) => {
      if (a.reportYear !== b.reportYear) {
        return b.reportYear - a.reportYear;
      }
      return (b.reportingMonth ?? 0) - (a.reportingMonth ?? 0);
    })[0];
  }

  private async ensureNodeExists(id: number) {
    const exists = await (this.prisma as any).logframeNode.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Logframe node not found');
    }
  }

  private async ensureIndicatorExists(id: number) {
    const exists = await (this.prisma as any).indicator.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException('Indicator not found');
    }
  }

  private toPercent(value: number, total: number) {
    if (!total || total <= 0) {
      return 0;
    }
    return Number(((value / total) * 100).toFixed(2));
  }
}
