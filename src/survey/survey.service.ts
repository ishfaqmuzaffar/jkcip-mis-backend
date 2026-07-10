import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// ─── Enums defined locally (not from @prisma/client — models added after baseline) ──
// Values must exactly match schema.prisma enum definitions
type SurveyRoundType    = 'BASELINE' | 'MIDLINE' | 'ENDLINE';
type SurveyRoundStatus  = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CONFIRMED';
type SurveyResponseStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED';

const SurveyRoundType = {
  BASELINE: 'BASELINE' as const,
  MIDLINE:  'MIDLINE'  as const,
  ENDLINE:  'ENDLINE'  as const,
};
const SurveyRoundStatus = {
  DRAFT:     'DRAFT'     as const,
  OPEN:      'OPEN'      as const,
  CLOSED:    'CLOSED'    as const,
  CONFIRMED: 'CONFIRMED' as const,
};
const SurveyResponseStatus = {
  DRAFT:     'DRAFT'     as const,
  SUBMITTED: 'SUBMITTED' as const,
  VERIFIED:  'VERIFIED'  as const,
};

// Shorthand so service code stays readable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

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
  annualIncome?: number;
  landHolding?: number;
  householdAssets?: Record<string, boolean>;
  cropData?: Array<{
    crop: string;
    area_ha: number;
    yield_kg: number;
    productivity_kg_ha: number;
    marketed_grade?: string;
  }>;
  isFpoMember?: boolean;
  fpoName?: string;
  fpoSalesIncrease?: boolean;
  fpoServicesRating?: number;
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

  // Typed accessor for new models not yet in generated Prisma client
  private get db(): Db { return this.prisma; }

  // ── Rounds ──────────────────────────────────────────────────────────────────

  async getRounds() {
    const rounds = await this.db.surveyRound.findMany({
      orderBy: { year: 'asc' },
      include: { _count: { select: { responses: true } } },
    });
    return rounds.map((r: any) => ({
      ...r,
      responseCount: r._count.responses,
      completionRate: r.targetCount > 0
        ? Math.round((r._count.responses / r.targetCount) * 100) : 0,
    }));
  }

  async getRound(id: number) {
    const round = await this.db.surveyRound.findUnique({
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
      completionRate: round.targetCount > 0
        ? Math.round((round._count.responses / round.targetCount) * 100) : 0,
    };
  }

  async createRound(dto: CreateRoundDto) {
    const existing = await this.db.surveyRound.findUnique({ where: { type: dto.type } });
    if (existing) {
      throw new BadRequestException(
        `A ${dto.type} round already exists (id: ${existing.id}).`,
      );
    }
    return this.db.surveyRound.create({ data: dto });
  }

  async updateRound(id: number, dto: UpdateRoundDto) {
    await this.getRound(id);
    return this.db.surveyRound.update({ where: { id }, data: dto });
  }

  async openRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.DRAFT) {
      throw new BadRequestException(`Round must be DRAFT to open. Current: ${round.status}`);
    }
    return this.db.surveyRound.update({
      where: { id },
      data: { status: SurveyRoundStatus.OPEN, openedAt: new Date() },
    });
  }

  async closeRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.OPEN) {
      throw new BadRequestException(`Round must be OPEN to close. Current: ${round.status}`);
    }
    await this.db.surveyRound.update({
      where: { id },
      data: { status: SurveyRoundStatus.CLOSED, closedAt: new Date() },
    });
    await this.computeIndicatorValues(id);
    return this.getRound(id);
  }

  async confirmRound(id: number) {
    const round = await this.getRound(id);
    if (round.status !== SurveyRoundStatus.CLOSED) {
      throw new BadRequestException(`Round must be CLOSED before confirming. Current: ${round.status}`);
    }
    await this.writeToLogframe(id, round.type as SurveyRoundType);
    return this.db.surveyRound.update({
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
      this.db.surveyResponse.count({ where }),
      this.db.surveyResponse.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, status: true, fullName: true, district: true,
          block: true, village: true, gender: true, isYouth: true,
          isBpl: true, category: true, beneficiaryId: true,
          beneficiaryUhid: true, annualIncome: true, landHolding: true,
          isFpoMember: true, satisfactionScore: true,
          decisionInfluenceScore: true, submittedAt: true, createdAt: true,
        },
      }),
    ]);
    return { total, page, limit, totalPages: Math.ceil(total / limit), items };
  }

  async getResponse(id: number) {
    const r = await this.db.surveyResponse.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Survey response ${id} not found`);
    return r;
  }

  async submitResponse(roundId: number, dto: SubmitResponseDto) {
    const round = await this.db.surveyRound.findUnique({ where: { id: roundId } });
    if (!round) throw new NotFoundException(`Survey round ${roundId} not found`);
    if (round.status !== SurveyRoundStatus.OPEN) {
      throw new BadRequestException(`Round is not open. Status: ${round.status}`);
    }

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

    if (dto.localId) {
      return this.db.surveyResponse.upsert({
        where: { roundId_localId: { roundId, localId: dto.localId } },
        update: data,
        create: data,
      });
    }
    if (beneficiaryId) {
      return this.db.surveyResponse.upsert({
        where: { roundId_beneficiaryId: { roundId, beneficiaryId } },
        update: data,
        create: data,
      });
    }
    return this.db.surveyResponse.create({ data });
  }

  async bulkSync(roundId: number, responses: SubmitResponseDto[]) {
    let synced = 0; let errors = 0; const details: string[] = [];
    for (const dto of responses) {
      try { await this.submitResponse(roundId, dto); synced++; }
      catch (e) { errors++; details.push(`${dto.localId ?? 'unknown'}: ${e.message}`); }
    }
    return { synced, errors, details };
  }

  // ── Indicator values ──────────────────────────────────────────────────────────

  async getIndicatorValues(roundId: number) {
    return this.db.surveyIndicatorValue.findMany({
      where: { roundId },
      include: {
        indicator: {
          select: {
            id: true, code: true, name: true, unit: true,
            baseline: true, midTarget: true, endTarget: true,
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
    const value = await this.db.surveyIndicatorValue.findUnique({
      where: { roundId_indicatorId: { roundId, indicatorId } },
    });
    if (!value) throw new NotFoundException(`No value for indicator ${indicatorId} in round ${roundId}`);
    return this.db.surveyIndicatorValue.update({
      where: { roundId_indicatorId: { roundId, indicatorId } },
      data: { reviewedValue: dto.reviewedValue, reviewNotes: dto.reviewNotes },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────

  async getStats(roundId: number) {
    const [total, byDistrict, byGender, byStatus] = await Promise.all([
      this.db.surveyResponse.count({ where: { roundId } }),
      this.db.surveyResponse.groupBy({ by: ['district'], where: { roundId }, _count: { id: true }, orderBy: { _count: { id: 'desc' } } }),
      this.db.surveyResponse.groupBy({ by: ['gender'], where: { roundId }, _count: { id: true } }),
      this.db.surveyResponse.groupBy({ by: ['status'], where: { roundId }, _count: { id: true } }),
    ]);
    const round = await this.db.surveyRound.findUnique({ where: { id: roundId }, select: { targetCount: true } });
    return {
      totalResponses: total,
      targetCount: round?.targetCount ?? 0,
      completionRate: round?.targetCount ? Math.round((total / round.targetCount) * 100) : 0,
      byDistrict: byDistrict.map((d: any) => ({ district: d.district ?? 'Unknown', count: d._count.id })),
      byGender:   byGender.map((g: any) => ({ gender: g.gender ?? 'Unknown', count: g._count.id })),
      byStatus:   byStatus.map((s: any) => ({ status: s.status, count: s._count.id })),
    };
  }

  // ── Comparison ────────────────────────────────────────────────────────────────

  async getComparison(indicatorIds?: number[]) {
    const rounds = await this.db.surveyRound.findMany({
      where: { status: { in: [SurveyRoundStatus.CLOSED, SurveyRoundStatus.CONFIRMED] } },
      orderBy: { year: 'asc' },
      select: { id: true, type: true, label: true, year: true },
    });
    const values = await this.db.surveyIndicatorValue.findMany({
      where: {
        roundId: { in: rounds.map((r: any) => r.id) },
        ...(indicatorIds?.length && { indicatorId: { in: indicatorIds } }),
      },
      include: {
        indicator: {
          select: {
            id: true, code: true, name: true, unit: true,
            logframeNode: { select: { code: true, title: true, level: true } },
          },
        },
      },
    });
    const byIndicator: Record<number, any> = {};
    for (const v of values) {
      if (!byIndicator[v.indicatorId]) {
        byIndicator[v.indicatorId] = { indicator: v.indicator, rounds: {} };
      }
      const round = rounds.find((r: any) => r.id === v.roundId);
      if (round) {
        byIndicator[v.indicatorId].rounds[round.type] = {
          value: v.reviewedValue ?? v.computedValue,
          sampleSize: v.sampleSize,
          roundLabel: round.label,
          writtenToLogframe: v.writtenToLogframe,
        };
      }
    }
    return { rounds, comparison: Object.values(byIndicator) };
  }

  // ── Private: aggregate responses → indicator values ────────────────────────

  private async computeIndicatorValues(roundId: number) {
    const responses = await this.db.surveyResponse.findMany({
      where: { roundId, status: SurveyResponseStatus.SUBMITTED },
    });
    const n = responses.length;
    if (n === 0) return;

    const avg = (field: string): number | null => {
      const vals = responses.map((r: any) => r[field]).filter((v: any) => v !== null && !isNaN(v));
      return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
    };
    const pct = (field: string): number => {
      return Math.round((responses.filter((r: any) => r[field] === true).length / n) * 100);
    };

    const indicators = await this.prisma.indicator.findMany({
      where: { active: true },
      select: { id: true, code: true, name: true, unit: true },
    });

    const upserts: Promise<any>[] = [];

    for (const ind of indicators) {
      let computedValue: number | null = null;
      const name = ind.name.toLowerCase();

      if (name.includes('income')) {
        computedValue = avg('annualIncome');
      } else if (name.includes('satisfaction') || name.includes('sf 2.1')) {
        const v = avg('satisfactionScore');
        computedValue = v !== null ? Math.round((v / 5) * 100) : null;
      } else if (name.includes('influence') || name.includes('sf 2.2')) {
        const v = avg('decisionInfluenceScore');
        computedValue = v !== null ? Math.round((v / 5) * 100) : null;
      } else if (name.includes('fpo') && name.includes('member')) {
        computedValue = pct('isFpoMember');
      }

      if (computedValue === null) continue;

      upserts.push(
        this.db.surveyIndicatorValue.upsert({
          where: { roundId_indicatorId: { roundId, indicatorId: ind.id } },
          update: { computedValue, sampleSize: n, unit: ind.unit },
          create: {
            roundId,
            indicatorId: ind.id,
            computedValue,
            sampleSize: n,
            unit: ind.unit,
            methodology: 'Auto-computed from survey responses on round close',
          },
        }),
      );
    }
    await Promise.all(upserts);
    return { computed: upserts.length };
  }

  // ── Private: write confirmed values to logframe ───────────────────────────────

  private async writeToLogframe(roundId: number, roundType: SurveyRoundType) {
    const values = await this.db.surveyIndicatorValue.findMany({ where: { roundId } });
    const field =
      roundType === SurveyRoundType.BASELINE ? 'baseline' :
      roundType === SurveyRoundType.MIDLINE  ? 'midTarget' : 'endTarget';

    await Promise.all(
      values.map((v: any) =>
        this.prisma.indicator.update({
          where: { id: v.indicatorId },
          data: { [field]: v.reviewedValue ?? v.computedValue },
        }).then(() =>
          this.db.surveyIndicatorValue.update({
            where: { id: v.id },
            data: { writtenToLogframe: true, writtenAt: new Date() },
          }),
        ),
      ),
    );
  }
}
