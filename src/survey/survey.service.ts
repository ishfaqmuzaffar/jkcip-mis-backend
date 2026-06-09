import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SurveyRoundType,
  SurveyRoundStatus,
  SurveyResponseStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateRoundDto {
  type: SurveyRoundType;
  label: string;
  year: number;
  description?: string;
  targetCount?: number;
}

export interface UpdateRoundDto {
  label?: string;
  description?: string;
  targetCount?: number;
}

export interface SubmitResponseDto {
  beneficiaryId?: number;
  beneficiaryUhid?: string;
  localId?: string;
  deviceId?: string;
  fullName?: string;
  district?: string;
  block?: string;
  village?: string;
  gender?: string;
  isYouth?: boolean;
  isBpl?: boolean;
  category?: string;
  // Section 1 — Household
  annualIncome?: number;
  landHolding?: number;
  householdAssets?: Record<string, boolean>;
  // Section 2 — Crop
  cropData?: Array<{
    crop: string;
    area_ha: number;
    yield_kg: number;
    productivity_kg_ha: number;
    marketed_grade?: string;
  }>;
  // Section 3 — FPO / PO
  isFpoMember?: boolean;
  fpoName?: string;
  fpoSalesIncrease?: boolean;
  fpoServicesRating?: number;
  // Section 4 — Satisfaction
  satisfactionScore?: number;
  decisionInfluenceScore?: number;
  remarks?: string;
}

export interface ReviewIndicatorValueDto {
  reviewedValue: number;
  reviewNotes?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SurveyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Rounds ──────────────────────────────────────────────────────────────────

  async getRounds() {
    const rounds = await this.prisma.surveyRound.findMany({
      orderBy: { year: 'asc' },
      include: {
        _count: { select: { responses: true } },
      },
    });

    return rounds.map((r) => ({
      ...r,
      responseCount: r._count.responses,
      completionRate:
        r.targetCount > 0
          ? Math.round((r._count.responses / r.targetCount) * 100)
          : 0,
    }));
  }

  async getRound(id: number) {
    const round = await this.prisma.surveyRound.findUnique({
      where: { id },
      include: {
        _count: { select: { responses: true } },
        indicatorValues: {
          include: {
            indicator: { select: { id: true, code: true, name: true, unit: true } },
          },
          orderBy: { indicatorId: 'asc' },
        },
      },
    });
    if (!round) throw new NotFoundException(`Survey round ${id} not found`);
    return {
      ...round,
      responseCount: round._count.responses,
      completionRate:
        round.targetCount > 0
          ? Math.round((round._count.responses / round.targetCount) * 100)
          : 0,
    };
  }

  async createRound(dto: CreateRoundDto) {
    // Enforce only one round per type
    const existing = await this.prisma.surveyRound.findUnique({
      where: { type: dto.type },
    });
    if (existing) {
      throw new BadRequestException(
        `A ${dto.type} round already exists (id: ${existing.id}). Only one round per type is allowed.`,
      );
    }
    return this.prisma.surveyRound.create({ data: dto });
  }

  async updateRound(id: number, dto: UpdateRoundDto) {
    await this.getRound(id); // throws if not found
    return this.prisma.surveyRound.update({ where: { id }, data: dto });
  }

  async openRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.DRAFT) {
      throw new BadRequestException(
        `Round must be in DRAFT status to open. Current: ${round.status}`,
      );
    }
    return this.prisma.surveyRound.update({
      where: { id },
      data: { status: SurveyRoundStatus.OPEN, openedAt: new Date() },
    });
  }

  async closeRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.OPEN) {
      throw new BadRequestException(
        `Round must be OPEN to close. Current: ${round.status}`,
      );
    }
    // Close the round first
    await this.prisma.surveyRound.update({
      where: { id },
      data: { status: SurveyRoundStatus.CLOSED, closedAt: new Date() },
    });
    // Then compute aggregates
    await this.computeIndicatorValues(id);
    return this.getRound(id);
  }

  async confirmRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.CLOSED) {
      throw new BadRequestException(
        `Round must be CLOSED before confirming. Current: ${round.status}`,
      );
    }
    // Write all reviewed (or computed) values to the logframe
    await this.writeToLogframe(id, round.type as SurveyRoundType);
    return this.prisma.surveyRound.update({
      where: { id },
      data: { status: SurveyRoundStatus.CONFIRMED, confirmedAt: new Date() },
    });
  }

  // ── Responses ────────────────────────────────────────────────────────────────

  async getResponses(
    roundId: number,
    filters: {
      district?: string;
      block?: string;
      status?: SurveyResponseStatus;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { district, block, status, page = 1, limit = 50 } = filters;
    const where = {
      roundId,
      ...(district && { district }),
      ...(block && { block }),
      ...(status && { status }),
    };
    const [total, items] = await Promise.all([
      this.prisma.surveyResponse.count({ where }),
      this.prisma.surveyResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          status: true,
          fullName: true,
          district: true,
          block: true,
          village: true,
          gender: true,
          isYouth: true,
          isBpl: true,
          category: true,
          beneficiaryId: true,
          beneficiaryUhid: true,
          annualIncome: true,
          landHolding: true,
          isFpoMember: true,
          satisfactionScore: true,
          decisionInfluenceScore: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
    ]);
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }

  async getResponse(id: number) {
    const r = await this.prisma.surveyResponse.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Survey response ${id} not found`);
    return r;
  }

  async submitResponse(roundId: number, dto: SubmitResponseDto) {
    const round = await this.prisma.surveyRound.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException(`Survey round ${roundId} not found`);
    if (round.status !== SurveyRoundStatus.OPEN) {
      throw new BadRequestException(
        `Round is not open for submissions. Status: ${round.status}`,
      );
    }

    // Resolve beneficiaryId from UHID if not provided
    let beneficiaryId = dto.beneficiaryId;
    if (!beneficiaryId && dto.beneficiaryUhid) {
      const ben = await this.prisma.beneficiary.findUnique({
        where: { uhid: dto.beneficiaryUhid },
        select: { id: true },
      });
      if (ben) beneficiaryId = ben.id;
    }

    const data = {
      roundId,
      beneficiaryId: beneficiaryId ?? null,
      beneficiaryUhid: dto.beneficiaryUhid ?? null,
      localId: dto.localId ?? null,
      deviceId: dto.deviceId ?? null,
      fullName: dto.fullName ?? null,
      district: dto.district ?? null,
      block: dto.block ?? null,
      village: dto.village ?? null,
      gender: dto.gender ?? null,
      isYouth: dto.isYouth ?? false,
      isBpl: dto.isBpl ?? false,
      category: dto.category ?? null,
      annualIncome: dto.annualIncome ?? null,
      landHolding: dto.landHolding ?? null,
      householdAssets: dto.householdAssets ?? undefined,
      cropData: dto.cropData ?? undefined,
      isFpoMember: dto.isFpoMember ?? null,
      fpoName: dto.fpoName ?? null,
      fpoSalesIncrease: dto.fpoSalesIncrease ?? null,
      fpoServicesRating: dto.fpoServicesRating ?? null,
      satisfactionScore: dto.satisfactionScore ?? null,
      decisionInfluenceScore: dto.decisionInfluenceScore ?? null,
      remarks: dto.remarks ?? null,
      status: SurveyResponseStatus.SUBMITTED,
      submittedAt: new Date(),
    };

    // Upsert: if a draft exists (offline sync), update it
    if (dto.localId) {
      return this.prisma.surveyResponse.upsert({
        where: { roundId_localId: { roundId, localId: dto.localId } },
        update: data,
        create: data,
      });
    }

    // If beneficiaryId known, upsert by that
    if (beneficiaryId) {
      return this.prisma.surveyResponse.upsert({
        where: { roundId_beneficiaryId: { roundId, beneficiaryId } },
        update: data,
        create: data,
      });
    }

    return this.prisma.surveyResponse.create({ data });
  }

  // Bulk sync — used by offline PWA when reconnecting (array of responses)
  async bulkSync(
    roundId: number,
    responses: SubmitResponseDto[],
  ): Promise<{ synced: number; errors: number; details: string[] }> {
    let synced = 0;
    let errors = 0;
    const details: string[] = [];

    for (const dto of responses) {
      try {
        await this.submitResponse(roundId, dto);
        synced++;
      } catch (e) {
        errors++;
        details.push(
          `${dto.localId ?? dto.beneficiaryUhid ?? 'unknown'}: ${e.message}`,
        );
      }
    }
    return { synced, errors, details };
  }

  // ── Indicator values (PMU review) ────────────────────────────────────────────

  async getIndicatorValues(roundId: number) {
    return this.prisma.surveyIndicatorValue.findMany({
      where: { roundId },
      include: {
        indicator: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            baseline: true,
            midTarget: true,
            endTarget: true,
            logframeNode: { select: { code: true, title: true, level: true } },
          },
        },
      },
      orderBy: { indicatorId: 'asc' },
    });
  }

  async reviewIndicatorValue(
    roundId: number,
    indicatorId: number,
    dto: ReviewIndicatorValueDto,
  ) {
    const value = await this.prisma.surveyIndicatorValue.findUnique({
      where: { roundId_indicatorId: { roundId, indicatorId } },
    });
    if (!value) {
      throw new NotFoundException(
        `No computed value for indicator ${indicatorId} in round ${roundId}`,
      );
    }
    return this.prisma.surveyIndicatorValue.update({
      where: { roundId_indicatorId: { roundId, indicatorId } },
      data: { reviewedValue: dto.reviewedValue, reviewNotes: dto.reviewNotes },
    });
  }

  // ── Statistics ───────────────────────────────────────────────────────────────

  async getStats(roundId: number) {
    const [total, byDistrict, byGender, byStatus] = await Promise.all([
      this.prisma.surveyResponse.count({ where: { roundId } }),
      this.prisma.surveyResponse.groupBy({
        by: ['district'],
        where: { roundId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.prisma.surveyResponse.groupBy({
        by: ['gender'],
        where: { roundId },
        _count: { id: true },
      }),
      this.prisma.surveyResponse.groupBy({
        by: ['status'],
        where: { roundId },
        _count: { id: true },
      }),
    ]);

    const round = await this.prisma.surveyRound.findUnique({
      where: { id: roundId },
      select: { targetCount: true },
    });

    return {
      totalResponses: total,
      targetCount: round?.targetCount ?? 0,
      completionRate:
        round?.targetCount
          ? Math.round((total / round.targetCount) * 100)
          : 0,
      byDistrict: byDistrict.map((d) => ({
        district: d.district ?? 'Unknown',
        count: d._count.id,
      })),
      byGender: byGender.map((g) => ({
        gender: g.gender ?? 'Unknown',
        count: g._count.id,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  // ── Comparison across rounds ─────────────────────────────────────────────────

  async getComparison(indicatorIds?: number[]) {
    const rounds = await this.prisma.surveyRound.findMany({
      where: { status: { in: [SurveyRoundStatus.CLOSED, SurveyRoundStatus.CONFIRMED] } },
      orderBy: { year: 'asc' },
      select: { id: true, type: true, label: true, year: true },
    });

    const values = await this.prisma.surveyIndicatorValue.findMany({
      where: {
        roundId: { in: rounds.map((r) => r.id) },
        ...(indicatorIds?.length && { indicatorId: { in: indicatorIds } }),
      },
      include: {
        indicator: {
          select: {
            id: true,
            code: true,
            name: true,
            unit: true,
            logframeNode: { select: { code: true, title: true, level: true } },
          },
        },
      },
    });

    // Group by indicator → rounds
    const byIndicator: Record<number, any> = {};
    for (const v of values) {
      if (!byIndicator[v.indicatorId]) {
        byIndicator[v.indicatorId] = {
          indicator: v.indicator,
          rounds: {},
        };
      }
      const round = rounds.find((r) => r.id === v.roundId);
      if (round) {
        byIndicator[v.indicatorId].rounds[round.type] = {
          value: v.reviewedValue ?? v.computedValue,
          sampleSize: v.sampleSize,
          roundLabel: round.label,
          writtenToLogframe: v.writtenToLogframe,
        };
      }
    }

    return {
      rounds,
      comparison: Object.values(byIndicator),
    };
  }

  // ── Private: aggregate responses → indicator values ──────────────────────────

  private async computeIndicatorValues(roundId: number) {
    const responses = await this.prisma.surveyResponse.findMany({
      where: { roundId, status: SurveyResponseStatus.SUBMITTED },
    });

    const n = responses.length;
    if (n === 0) return;

    // Helper: average a numeric field across responses (ignoring nulls)
    const avg = (field: keyof typeof responses[0]): number | null => {
      const vals = responses
        .map((r) => r[field] as number | null)
        .filter((v): v is number => v !== null && !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    // Helper: percentage of responses where field is true
    const pct = (field: keyof typeof responses[0]): number => {
      const trueCount = responses.filter((r) => r[field] === true).length;
      return Math.round((trueCount / n) * 100);
    };

    // Helper: average of a score field, disaggregated
    const avgDisagg = (field: keyof typeof responses[0]) => {
      const total = avg(field);
      const maleVal = (() => {
        const vals = responses
          .filter((r) => r.gender === 'Male')
          .map((r) => r[field] as number | null)
          .filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })();
      const femaleVal = (() => {
        const vals = responses
          .filter((r) => r.gender === 'Female')
          .map((r) => r[field] as number | null)
          .filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })();
      const youthVal = (() => {
        const vals = responses
          .filter((r) => r.isYouth === true)
          .map((r) => r[field] as number | null)
          .filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })();
      const bplVal = (() => {
        const vals = responses
          .filter((r) => r.isBpl === true)
          .map((r) => r[field] as number | null)
          .filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })();
      const indigenousVal = (() => {
        const vals = responses
          .filter((r) => r.category === 'ST' || r.category === 'SC')
          .map((r) => r[field] as number | null)
          .filter((v): v is number => v !== null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      })();
      return { total, maleVal, femaleVal, youthVal, bplVal, indigenousVal };
    };

    // Crop-level aggregation across all responses
    const cropAgg: Record<string, { productivity: number[]; grade_a_count: number; total: number }> = {};
    for (const r of responses) {
      const crops = r.cropData as any[] | null;
      if (!crops) continue;
      for (const c of crops) {
        if (!cropAgg[c.crop]) cropAgg[c.crop] = { productivity: [], grade_a_count: 0, total: 0 };
        if (c.productivity_kg_ha) cropAgg[c.crop].productivity.push(c.productivity_kg_ha);
        if (c.marketed_grade === 'A' || c.marketed_grade === 'Premium') cropAgg[c.crop].grade_a_count++;
        cropAgg[c.crop].total++;
      }
    }

    // Fetch indicators that have crop-level computation
    const indicators = await this.prisma.indicator.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, unit: true, crop: true },
    });

    const upserts: Array<Parameters<typeof this.prisma.surveyIndicatorValue.upsert>[0]> = [];

    for (const ind of indicators) {
      let computedValue: number | null = null;
      let maleValue: number | null = null;
      let femaleValue: number | null = null;
      let youthValue: number | null = null;
      let indigenousValue: number | null = null;
      let bplValue: number | null = null;
      let sampleSize = n;

      const code = ind.code.toLowerCase();
      const name = ind.name.toLowerCase();

      // ── Income indicators ──────────────────────────────────────────────
      if (name.includes('income') || name.includes('70%')) {
        const d = avgDisagg('annualIncome');
        computedValue = d.total;
        maleValue = d.maleVal;
        femaleValue = d.femaleVal;
        youthValue = d.youthVal;
        indigenousValue = d.indigenousVal;
        bplValue = d.bplVal;
      }

      // ── Satisfaction indicators (SF 2.1) ───────────────────────────────
      else if (name.includes('satisfaction') || name.includes('sf 2.1') || code.includes('sf21')) {
        const d = avgDisagg('satisfactionScore');
        computedValue = d.total !== null ? Math.round((d.total / 5) * 100) : null; // as %
        maleValue = d.maleVal !== null ? Math.round((d.maleVal / 5) * 100) : null;
        femaleValue = d.femaleVal !== null ? Math.round((d.femaleVal / 5) * 100) : null;
        youthValue = d.youthVal !== null ? Math.round((d.youthVal / 5) * 100) : null;
        indigenousValue = d.indigenousVal !== null ? Math.round((d.indigenousVal / 5) * 100) : null;
        bplValue = d.bplVal !== null ? Math.round((d.bplVal / 5) * 100) : null;
      }

      // ── Decision influence indicators (SF 2.2) ─────────────────────────
      else if (name.includes('influence') || name.includes('sf 2.2') || code.includes('sf22')) {
        const d = avgDisagg('decisionInfluenceScore');
        computedValue = d.total !== null ? Math.round((d.total / 5) * 100) : null;
        maleValue = d.maleVal !== null ? Math.round((d.maleVal / 5) * 100) : null;
        femaleValue = d.femaleVal !== null ? Math.round((d.femaleVal / 5) * 100) : null;
        youthValue = d.youthVal !== null ? Math.round((d.youthVal / 5) * 100) : null;
        indigenousValue = d.indigenousVal !== null ? Math.round((d.indigenousVal / 5) * 100) : null;
        bplValue = d.bplVal !== null ? Math.round((d.bplVal / 5) * 100) : null;
      }

      // ── FPO member indicators ──────────────────────────────────────────
      else if (name.includes('fpo') && name.includes('member')) {
        computedValue = pct('isFpoMember');
        maleValue = (() => {
          const males = responses.filter((r) => r.gender === 'Male');
          return males.length
            ? Math.round((males.filter((r) => r.isFpoMember).length / males.length) * 100)
            : null;
        })();
        femaleValue = (() => {
          const females = responses.filter((r) => r.gender === 'Female');
          return females.length
            ? Math.round((females.filter((r) => r.isFpoMember).length / females.length) * 100)
            : null;
        })();
      }

      // ── Crop-specific productivity indicators ──────────────────────────
      else if (ind.crop) {
        const cropKey = Object.keys(cropAgg).find(
          (k) => k.toLowerCase() === ind.crop!.toLowerCase(),
        );
        if (cropKey) {
          const agg = cropAgg[cropKey];
          sampleSize = agg.total;
          if (name.includes('productivity') || name.includes('kg/ha') || name.includes('mt/ha')) {
            const vals = agg.productivity;
            computedValue = vals.length
              ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
              : null;
          } else if (name.includes('premium') || name.includes('a-grade')) {
            computedValue = agg.total > 0
              ? Math.round((agg.grade_a_count / agg.total) * 100)
              : null;
          }
        }
      }

      if (computedValue === null) continue; // no computation for this indicator type

      upserts.push({
        where: { roundId_indicatorId: { roundId, indicatorId: ind.id } },
        update: {
          computedValue,
          maleValue,
          femaleValue,
          youthValue,
          indigenousValue,
          bplValue,
          sampleSize,
          unit: ind.unit,
        },
        create: {
          roundId,
          indicatorId: ind.id,
          computedValue,
          maleValue,
          femaleValue,
          youthValue,
          indigenousValue,
          bplValue,
          sampleSize,
          unit: ind.unit,
          methodology: 'Auto-computed from survey responses on round close',
        },
      });
    }

    // Run all upserts
    await Promise.all(upserts.map((u) => this.prisma.surveyIndicatorValue.upsert(u)));
    return { computed: upserts.length };
  }

  // ── Private: write confirmed values to the logframe ──────────────────────────

  private async writeToLogframe(roundId: number, roundType: SurveyRoundType) {
    const values = await this.prisma.surveyIndicatorValue.findMany({
      where: { roundId },
    });

    const field: 'baseline' | 'midTarget' | 'endTarget' =
      roundType === SurveyRoundType.BASELINE
        ? 'baseline'
        : roundType === SurveyRoundType.MIDLINE
        ? 'midTarget'
        : 'endTarget';

    await Promise.all(
      values.map((v) =>
        this.prisma.indicator
          .update({
            where: { id: v.indicatorId },
            data: { [field]: v.reviewedValue ?? v.computedValue },
          })
          .then(() =>
            this.prisma.surveyIndicatorValue.update({
              where: { id: v.id },
              data: { writtenToLogframe: true, writtenAt: new Date() },
            }),
          ),
      ),
    );
  }
}
