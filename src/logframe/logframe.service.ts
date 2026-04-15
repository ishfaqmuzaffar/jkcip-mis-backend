import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Indicator, IndicatorFrequency, LogframeLevel, Prisma } from '@prisma/client';
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
    const nodes = await this.prisma.logframeNode.findMany({
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
    return this.prisma.logframeNode.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      include: {
        parent: { select: { id: true, title: true, code: true, level: true } },
        _count: { select: { indicators: true, children: true } },
      },
    });
  }

  async createNode(dto: CreateLogframeNodeDto) {
    return this.prisma.logframeNode.create({
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

    return this.prisma.logframeNode.update({
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
    const indicators = await this.prisma.indicator.findMany({
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
    const indicator = await this.prisma.indicator.findUnique({
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

    const indicator = await this.prisma.indicator.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        unit: dto.unit,
        baseline: dto.baseline,
        midTarget: dto.midTarget,
        endTarget: dto.endTarget,
        frequency: dto.frequency as IndicatorFrequency,
        source: dto.source,
        responsibility: dto.responsibility,
        active: dto.active ?? true,
        supportsGenderBreakdown: dto.supportsGenderBreakdown ?? false,
        supportsYouthBreakdown: dto.supportsYouthBreakdown ?? false,
        supportsIndigenousBreakdown: dto.supportsIndigenousBreakdown ?? false,
        supportsHouseholdBreakdown: dto.supportsHouseholdBreakdown ?? false,
        supportsBlockBreakdown: dto.supportsBlockBreakdown ?? false,
        logframeNode: {
          connect: { id: dto.logframeNodeId },
        },
      },
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

    const indicator = await this.prisma.indicator.update({
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

    const rows = await this.prisma.indicatorYearProgress.findMany({
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

    const row = await this.prisma.indicatorYearProgress.upsert({
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

    const indicator = await this.prisma.indicator.findUnique({
      where: { id: indicatorId },
      include: { yearlyProgress: { orderBy: { reportYear: 'asc' } } },
    });

    return {
      row,
      aggregated: this.aggregateProgressRows(indicator?.yearlyProgress ?? []),
    };
  }

  async previewImport(fileBuffer: Buffer, fileName: string) {
    const prepared = await this.prepareImport(fileBuffer, fileName);
    return {
      fileName,
      summary: prepared.summary,
      rows: prepared.previewRows.slice(0, 200),
      note: prepared.previewRows.length > 200 ? 'Preview truncated to first 200 rows.' : null,
    };
  }

  async commitImport(fileBuffer: Buffer, fileName: string, mode: 'skip' | 'update' = 'skip') {
    const prepared = await this.prepareImport(fileBuffer, fileName);

    let createdNodes = 0;
    let updatedNodes = 0;
    let createdIndicators = 0;
    let updatedIndicators = 0;
    let skippedIndicators = 0;

    for (const row of prepared.rows) {
      const node = await this.upsertImportNode(row, mode);
      if (row.nodeAction == 'create') createdNodes += 1;
      if (row.nodeAction == 'update') updatedNodes += 1;

      if (row.indicatorAction == 'skip') {
        skippedIndicators += 1;
        continue;
      }

      const indicatorPayload: Prisma.IndicatorUncheckedCreateInput = {
        code: row.indicatorCode,
        name: row.indicatorName,
        description: row.description,
        unit: row.unit,
        baseline: row.baseline,
        midTarget: row.midTarget,
        endTarget: row.endTarget,
        frequency: row.frequency,
        source: row.source,
        responsibility: row.responsibility,
        department: row.department,
        sector: row.sector,
        crop: row.crop,
        tags: row.tags,
        dimensionConfig: row.dimensionConfig as Prisma.InputJsonValue | undefined,
        supportsDistrictBreakdown: row.supportsDistrictBreakdown,
        supportsBlockBreakdown: row.supportsBlockBreakdown,
        supportsGenderBreakdown: row.supportsGenderBreakdown,
        supportsYouthBreakdown: row.supportsYouthBreakdown,
        supportsIndigenousBreakdown: row.supportsIndigenousBreakdown,
        supportsHouseholdBreakdown: row.supportsHouseholdBreakdown,
        active: row.active,
        logframeNodeId: node.id,
      };

      if (row.existingIndicatorId) {
        if (mode === 'update' && row.indicatorAction === 'update') {
          await this.prisma.indicator.update({
            where: { id: row.existingIndicatorId },
            data: {
              code: row.indicatorCode,
              name: row.indicatorName,
              description: row.description,
              unit: row.unit,
              baseline: row.baseline,
              midTarget: row.midTarget,
              endTarget: row.endTarget,
              frequency: row.frequency,
              source: row.source,
              responsibility: row.responsibility,
              department: row.department,
              sector: row.sector,
              crop: row.crop,
              tags: row.tags,
              dimensionConfig: row.dimensionConfig as Prisma.InputJsonValue | undefined,
              supportsDistrictBreakdown: row.supportsDistrictBreakdown,
              supportsBlockBreakdown: row.supportsBlockBreakdown,
              supportsGenderBreakdown: row.supportsGenderBreakdown,
              supportsYouthBreakdown: row.supportsYouthBreakdown,
              supportsIndigenousBreakdown: row.supportsIndigenousBreakdown,
              supportsHouseholdBreakdown: row.supportsHouseholdBreakdown,
              active: row.active,
              logframeNodeId: node.id,
            },
          });
          updatedIndicators += 1;
        } else {
          skippedIndicators += 1;
        }
      } else {
        await this.prisma.indicator.create({ data: indicatorPayload });
        createdIndicators += 1;
      }
    }

    return {
      fileName,
      mode,
      summary: prepared.summary,
      committed: {
        createdNodes,
        updatedNodes,
        createdIndicators,
        updatedIndicators,
        skippedIndicators,
      },
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
      this.prisma.logframeNode.count(),
      this.prisma.indicator.count(),
      this.prisma.indicator.count({ where: { active: true } }),
      this.prisma.indicatorYearProgress.findMany({
        where: year ? { reportYear: year } : undefined,
      }),
      this.prisma.indicator.findMany({
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
    const outcomes = await this.prisma.logframeNode.findMany({
      where: { level: LogframeLevel.OUTCOME },
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

  private async prepareImport(fileBuffer: Buffer, fileName: string) {
    const parsedRows = this.parseImportWorkbook(fileBuffer, fileName);
    if (parsedRows.length == 0) {
      throw new BadRequestException('No importable rows were found in the uploaded file.');
    }

    const nodeCache = await this.buildNodeLookup();
    const indicatorCache = await this.buildIndicatorLookup();

    let rowNumber = 1;
    const rows = [];
    const previewRows = [];
    const summary = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      newNodes: 0,
      existingNodes: 0,
      changedNodes: 0,
      newIndicators: 0,
      duplicateIndicators: 0,
      changedIndicators: 0,
    };

    for (const raw of parsedRows) {
      rowNumber += 1;
      summary.totalRows += 1;

      const row = this.normalizeImportRow(raw, rowNumber);
      if (row.errors.length > 0) {
        summary.invalidRows += 1;
        previewRows.push({ rowNumber, status: 'invalid', errors: row.errors, raw });
        continue;
      }

      const parent = row.parentNodeCode ? nodeCache.byCode.get(row.parentNodeCode) : null;
      const nodeKey = this.nodeUniqueKey(row.nodeCode, row.nodeTitle, row.level, parent?.id ?? null);
      const existingNode = nodeCache.byCode.get(row.nodeCode) || nodeCache.byNaturalKey.get(nodeKey) || null;

      row.existingNodeId = existingNode?.id ?? null;
      row.nodeAction = existingNode ? (this.nodeChanged(existingNode, row, parent?.id ?? null) ? 'update' : 'existing') : 'create';
      if (row.nodeAction === 'create') summary.newNodes += 1;
      else if (row.nodeAction === 'update') summary.changedNodes += 1;
      else summary.existingNodes += 1;

      const indicatorKey = this.indicatorUniqueKey(row.indicatorCode, row.indicatorName, existingNode?.id ?? -1, row.nodeTitle);
      const existingIndicator = (row.indicatorCode ? indicatorCache.byCode.get(row.indicatorCode) : null)
        || indicatorCache.byNaturalKey.get(indicatorKey)
        || null;

      row.existingIndicatorId = existingIndicator?.id ?? null;
      row.indicatorAction = existingIndicator
        ? (this.indicatorChanged(existingIndicator, row, existingNode?.id ?? null) ? 'update' : 'skip')
        : 'create';

      if (row.indicatorAction === 'create') summary.newIndicators += 1;
      else if (row.indicatorAction === 'update') summary.changedIndicators += 1;
      else summary.duplicateIndicators += 1;

      summary.validRows += 1;

      rows.push(row);

      previewRows.push({
        rowNumber,
        status: row.indicatorAction === 'create' ? 'new' : row.indicatorAction === 'update' ? 'changed' : 'duplicate',
        node: { code: row.nodeCode, title: row.nodeTitle, action: row.nodeAction },
        indicator: { code: row.indicatorCode, name: row.indicatorName, action: row.indicatorAction },
        messages: [
          row.nodeAction === 'create' ? 'New node will be created.' : row.nodeAction === 'update' ? 'Existing node will be updated.' : 'Node already exists.',
          row.indicatorAction === 'create' ? 'New indicator will be created.' : row.indicatorAction === 'update' ? 'Existing indicator differs and can be updated.' : 'Duplicate indicator detected.',
        ],
      });

      if (!existingNode) {
        const shadowNode = { id: -summary.totalRows, code: row.nodeCode, title: row.nodeTitle, level: row.level, description: row.nodeDescription ?? null, sortOrder: row.sortOrder ?? 0, active: row.active, parentId: parent?.id ?? null };
        nodeCache.byCode.set(row.nodeCode, shadowNode);
        nodeCache.byNaturalKey.set(nodeKey, shadowNode);
      }
    }

    return { rows, previewRows, summary };
  }

  private parseImportWorkbook(fileBuffer: Buffer, fileName: string) {
    if (!fileName.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported.');
    }

    const text = fileBuffer.toString('utf-8').replace(/^﻿/, '');
    const rows = this.parseCsvText(text);

    if (rows.length === 0) {
      throw new BadRequestException('The uploaded CSV file is empty.');
    }

    return rows;
  }

  private parseCsvText(text: string): Record<string, unknown>[] {
    const lines = text.split('\n').filter(l => l.trim() !== '');
      .filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      return [];
    }

    const headers = this.parseCsvLine(lines[0]).map((header) => header.trim());

    return lines.slice(1).map((line) => {
      const values = this.parseCsvLine(line);
      const row: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? null;
      });

      return row;
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private normalizeImportRow(raw: Record<string, unknown>, rowNumber: number) {
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const normalized = this.normalizeHeader(key);
        for (const [rawKey, value] of Object.entries(raw)) {
          if (this.normalizeHeader(rawKey) === normalized && value !== null && value !== undefined && String(value).trim() !== '') {
            return value;
          }
        }
      }
      return null;
    };

    const level = this.parseLogframeLevel(read('level', 'logframe level', 'node level', 'results level'));
    const nodeTitle = this.stringValue(read('node title', 'logframe node', 'node', 'outcome', 'results hierarchy'));
    const parentNodeCode = this.stringValue(read('parent node code', 'parent code', 'parent_node_code'));
    const parentNodeTitle = this.stringValue(read('parent node title', 'parent title', 'parent_node_title'));
    const nodeCodeBase = this.stringValue(read('node code', 'logframe node code', 'outcome code')) || this.slug(nodeTitle);
    const indicatorName = this.stringValue(read('indicator name', 'indicator', 'name'));
    const indicatorCode = this.stringValue(read('indicator code', 'code', 'indicator_code')) || `${nodeCodeBase}-IND-${this.slug(indicatorName).slice(0, 24).toUpperCase()}`;

    const row = {
      rowNumber,
      errors: [] as string[],
      level,
      nodeCode: nodeCodeBase,
      nodeTitle,
      nodeDescription: this.stringValue(read('node description', 'outcome description', 'description')),
      parentNodeCode,
      parentNodeTitle,
      sortOrder: this.numberValue(read('sort order', 'sort_order')) ?? 0,
      indicatorCode,
      indicatorName,
      description: this.stringValue(read('indicator description', 'definition', 'description')),
      unit: this.stringValue(read('unit', 'unit of measure', 'measurement unit')),
      baseline: this.numberValue(read('baseline', 'baseline value')),
      midTarget: this.numberValue(read('mid target', 'midterm target', 'mid-term target', 'mid target value')),
      endTarget: this.numberValue(read('end target', 'end-term target', 'end target value')),
      frequency: this.parseFrequency(this.stringValue(read('frequency', 'reporting frequency'))),
      source: this.stringValue(read('source', 'means of verification', 'mov')),
      responsibility: this.stringValue(read('responsibility', 'responsible unit', 'owner')),
      department: this.stringValue(read('department')),
      sector: this.stringValue(read('sector')),
      crop: this.stringValue(read('crop')),
      tags: this.stringListValue(read('tags')),
      dimensionConfig: this.jsonValue(read('dimension config', 'dimension_config')),
      supportsDistrictBreakdown: this.boolValue(read('supports district breakdown', 'district breakdown')) ?? false,
      supportsBlockBreakdown: this.boolValue(read('supports block breakdown', 'block breakdown')) ?? false,
      supportsGenderBreakdown: this.boolValue(read('supports gender breakdown', 'gender breakdown')) ?? false,
      supportsYouthBreakdown: this.boolValue(read('supports youth breakdown', 'youth breakdown')) ?? false,
      supportsIndigenousBreakdown: this.boolValue(read('supports indigenous breakdown', 'indigenous breakdown')) ?? false,
      supportsHouseholdBreakdown: this.boolValue(read('supports household breakdown', 'household breakdown')) ?? false,
      active: this.boolValue(read('active', 'is active')) ?? true,
      existingNodeId: null as number | null,
      existingIndicatorId: null as number | null,
      nodeAction: 'create' as 'create' | 'existing' | 'update',
      indicatorAction: 'create' as 'create' | 'skip' | 'update',
    };

    if (!row.level) row.errors.push('Missing level.');
    if (!row.nodeTitle) row.errors.push('Missing node title.');
    if (!row.indicatorName) row.errors.push('Missing indicator name.');
    if (!row.nodeCode) row.errors.push('Unable to derive node code.');
    if (!row.indicatorCode) row.errors.push('Unable to derive indicator code.');

    return row;
  }

  private async buildNodeLookup() {
    const nodes = await this.prisma.logframeNode.findMany();
    const byCode = new Map<string, any>();
    const byNaturalKey = new Map<string, any>();
    for (const node of nodes) {
      byCode.set(node.code, node);
      byNaturalKey.set(this.nodeUniqueKey(node.code, node.title, node.level, node.parentId ?? null), node);
    }
    return { byCode, byNaturalKey };
  }

  private async buildIndicatorLookup() {
    const indicators = await this.prisma.indicator.findMany();
    const byCode = new Map<string, any>();
    const byNaturalKey = new Map<string, any>();
    for (const indicator of indicators) {
      byCode.set(indicator.code, indicator);
      byNaturalKey.set(this.indicatorUniqueKey(indicator.code, indicator.name, indicator.logframeNodeId, ''), indicator);
    }
    return { byCode, byNaturalKey };
  }

  private nodeUniqueKey(code: string | null, title: string | null, level: LogframeLevel | null, parentId: number | null) {
    return `${code ?? ''}::${this.slug(title)}::${level ?? ''}::${parentId ?? ''}`;
  }

  private indicatorUniqueKey(code: string | null, name: string | null, nodeId: number | null, nodeTitle: string | null) {
    return `${code ?? ''}::${this.slug(name)}::${nodeId ?? ''}::${this.slug(nodeTitle)}`;
  }

  private nodeChanged(existing: any, row: any, parentId: number | null) {
    return existing.title !== row.nodeTitle
      || existing.level !== row.level
      || (existing.description ?? null) !== (row.nodeDescription ?? null)
      || (existing.parentId ?? null) !== (parentId ?? null)
      || (existing.sortOrder ?? 0) !== (row.sortOrder ?? 0)
      || existing.active !== row.active;
  }

  private indicatorChanged(existing: any, row: any, nodeId: number | null) {
    const tags = JSON.stringify(existing.tags ?? []);
    const rowTags = JSON.stringify(row.tags ?? []);
    return existing.name !== row.indicatorName
      || (existing.description ?? null) !== (row.description ?? null)
      || (existing.unit ?? null) !== (row.unit ?? null)
      || (existing.baseline ?? null) !== (row.baseline ?? null)
      || (existing.midTarget ?? null) !== (row.midTarget ?? null)
      || (existing.endTarget ?? null) !== (row.endTarget ?? null)
      || existing.frequency !== row.frequency
      || (existing.source ?? null) !== (row.source ?? null)
      || (existing.responsibility ?? null) !== (row.responsibility ?? null)
      || (existing.department ?? null) !== (row.department ?? null)
      || (existing.sector ?? null) !== (row.sector ?? null)
      || (existing.crop ?? null) !== (row.crop ?? null)
      || tags !== rowTags
      || JSON.stringify(existing.dimensionConfig ?? null) !== JSON.stringify(row.dimensionConfig ?? null)
      || existing.supportsDistrictBreakdown !== row.supportsDistrictBreakdown
      || existing.supportsBlockBreakdown !== row.supportsBlockBreakdown
      || existing.supportsGenderBreakdown !== row.supportsGenderBreakdown
      || existing.supportsYouthBreakdown !== row.supportsYouthBreakdown
      || existing.supportsIndigenousBreakdown !== row.supportsIndigenousBreakdown
      || existing.supportsHouseholdBreakdown !== row.supportsHouseholdBreakdown
      || existing.active !== row.active
      || (nodeId != null && existing.logframeNodeId !== nodeId);
  }

  private async upsertImportNode(row: any, mode: 'skip' | 'update') {
    let parentId: number | null = null;
    if (row.parentNodeCode) {
      const parent = await this.prisma.logframeNode.findFirst({
        where: { OR: [{ code: row.parentNodeCode }, { title: row.parentNodeTitle ?? row.parentNodeCode }] },
      });
      parentId = parent?.id ?? null;
    }

    const existing = await this.prisma.logframeNode.findFirst({
      where: {
        OR: [
          { code: row.nodeCode },
          { title: row.nodeTitle, level: row.level, parentId },
        ],
      },
    });

    if (existing) {
      if (mode === 'update' && this.nodeChanged(existing, row, parentId)) {
        return this.prisma.logframeNode.update({
          where: { id: existing.id },
          data: {
            title: row.nodeTitle,
            level: row.level,
            description: row.nodeDescription,
            parentId,
            sortOrder: row.sortOrder ?? 0,
            active: row.active,
          },
        });
      }
      return existing;
    }

    return this.prisma.logframeNode.create({
      data: {
        code: row.nodeCode,
        title: row.nodeTitle,
        level: row.level,
        description: row.nodeDescription,
        parentId,
        sortOrder: row.sortOrder ?? 0,
        active: row.active,
      },
    });
  }

  private normalizeHeader(value: string | null | undefined) {
    return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

  private stringValue(value: unknown) {
    const text = String(value ?? '').trim();
    return text ? text : null;
  }

  private numberValue(value: unknown) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const cleaned = String(value).replace(/,/g, '').trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private boolValue(value: unknown) {
    const text = String(value ?? '').trim().toLowerCase();
    if (!text) return null;
    if (['true', '1', 'yes', 'y'].includes(text)) return true;
    if (['false', '0', 'no', 'n'].includes(text)) return false;
    return null;
  }

  private stringListValue(value: unknown) {
    const text = this.stringValue(value);
    if (!text) return [];
    return text.split(',').map((item) => item.trim()).filter(Boolean);
  }

  private jsonValue(value: unknown) {
    const text = this.stringValue(value);
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return { raw: text };
    }
  }

  private parseFrequency(value: string | null): IndicatorFrequency {
    const text = (value ?? '').toUpperCase().replace(/[^A-Z]+/g, '_');
    const map: Record<string, IndicatorFrequency> = {
      MONTHLY: IndicatorFrequency.MONTHLY,
      QUARTERLY: IndicatorFrequency.QUARTERLY,
      HALF_YEARLY: IndicatorFrequency.HALF_YEARLY,
      HALF_YEAR: IndicatorFrequency.HALF_YEARLY,
      ANNUAL: IndicatorFrequency.ANNUAL,
      YEARLY: IndicatorFrequency.ANNUAL,
      BIENNIAL: IndicatorFrequency.BIENNIAL,
      MID_TERM: IndicatorFrequency.MID_TERM,
      END_TERM: IndicatorFrequency.END_TERM,
      AD_HOC: IndicatorFrequency.AD_HOC,
    };
    return map[text] ?? IndicatorFrequency.ANNUAL;
  }

  private parseLogframeLevel(value: unknown): LogframeLevel | null {
    const text = String(value ?? '').trim().toUpperCase().replace(/[^A-Z]+/g, '_');
    const map: Record<string, LogframeLevel> = {
      OUTREACH: LogframeLevel.OUTREACH,
      GOAL: LogframeLevel.GOAL,
      DEVELOPMENT_OBJECTIVE: LogframeLevel.DEVELOPMENT_OBJECTIVE,
      DEV_OBJECTIVE: LogframeLevel.DEVELOPMENT_OBJECTIVE,
      OUTCOME: LogframeLevel.OUTCOME,
      OUTPUT: LogframeLevel.OUTPUT,
      SUB_OUTPUT: LogframeLevel.SUB_OUTPUT,
      SUBOUTPUT: LogframeLevel.SUB_OUTPUT,
      INDICATOR_GROUP: LogframeLevel.INDICATOR_GROUP,
    };
    return map[text] ?? null;
  }

  private slug(value: string | null) {
    return String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private mapIndicatorData(dto: UpdateIndicatorDto): Prisma.IndicatorUpdateInput {
    return {
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
      ...(dto.baseline !== undefined ? { baseline: dto.baseline } : {}),
      ...(dto.midTarget !== undefined ? { midTarget: dto.midTarget } : {}),
      ...(dto.endTarget !== undefined ? { endTarget: dto.endTarget } : {}),
      ...(dto.frequency !== undefined ? { frequency: dto.frequency as IndicatorFrequency } : {}),
      ...(dto.source !== undefined ? { source: dto.source } : {}),
      ...(dto.responsibility !== undefined ? { responsibility: dto.responsibility } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.supportsGenderBreakdown !== undefined
        ? { supportsGenderBreakdown: dto.supportsGenderBreakdown }
        : {}),
      ...(dto.supportsYouthBreakdown !== undefined
        ? { supportsYouthBreakdown: dto.supportsYouthBreakdown }
        : {}),
      ...(dto.supportsIndigenousBreakdown !== undefined
        ? { supportsIndigenousBreakdown: dto.supportsIndigenousBreakdown }
        : {}),
      ...(dto.supportsHouseholdBreakdown !== undefined
        ? { supportsHouseholdBreakdown: dto.supportsHouseholdBreakdown }
        : {}),
      ...(dto.supportsBlockBreakdown !== undefined
        ? { supportsBlockBreakdown: dto.supportsBlockBreakdown }
        : {}),
      ...(dto.logframeNodeId !== undefined
        ? {
            logframeNode: {
              connect: { id: dto.logframeNodeId },
            },
          }
        : {}),
    };
  }

  private decorateIndicator<T extends Indicator & { yearlyProgress?: any[]; logframeNode?: any }>(indicator: T) {
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
    const exists = await this.prisma.logframeNode.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Logframe node not found');
    }
  }

  private async ensureIndicatorExists(id: number) {
    const exists = await this.prisma.indicator.findUnique({
      where: { id },
      select: { id: true },
    });

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