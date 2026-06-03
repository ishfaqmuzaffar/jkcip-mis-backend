import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AWPBStatus, UserRole } from '@prisma/client';

// Stage transition map — what each role can do at each stage
const STAGE_TRANSITIONS: Record<string, { next: AWPBStatus; prev?: AWPBStatus }> = {
  DRAFT:            { next: 'PIU_REVIEW' },
  PIU_REVIEW:       { next: 'PMU_REVIEW',       prev: 'DRAFT' },
  PMU_REVIEW:       { next: 'IFAD_SUBMISSION',  prev: 'PIU_REVIEW' },
  IFAD_SUBMISSION:  { next: 'IFAD_APPROVED',    prev: 'PMU_REVIEW' },
  IFAD_APPROVED:    { next: 'DPC_APPROVED' },
  DPC_APPROVED:     { next: 'DAP_APPROVED' },
};

const STAGE_LABELS: Record<string, string> = {
  DRAFT:           'Draft',
  PIU_REVIEW:      'PIU Review',
  PMU_REVIEW:      'PMU Review',
  IFAD_SUBMISSION: 'IFAD Submission',
  IFAD_APPROVED:   'IFAD Approved',
  DPC_APPROVED:    'DPC Approved',
  DAP_APPROVED:    'DAP Approved',
  REJECTED:        'Rejected',
  RETURNED:        'Returned',
};

// Which roles can approve at each stage
const STAGE_APPROVERS: Record<string, UserRole[]> = {
  DRAFT:           ['DATA_ENTRY', 'DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'],
  PIU_REVIEW:      ['DEPARTMENT_OFFICER', 'ADMIN', 'SUPER_ADMIN'],
  PMU_REVIEW:      ['ADMIN', 'SUPER_ADMIN'],
  IFAD_SUBMISSION: ['SUPER_ADMIN'],
  IFAD_APPROVED:   ['SUPER_ADMIN'],
  DPC_APPROVED:    ['SUPER_ADMIN'],
};

@Injectable()
export class AWPBService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ──────────────────────────────────────────────────────────────
  async create(dto: any, userId: number) {
    const awpb = await this.prisma.aWPB.create({
      data: {
        title: dto.title,
        financialYear: dto.financialYear,
        district: dto.district || null,
        department: dto.department || null,
        remarks: dto.remarks || null,
        totalBudget: dto.totalBudget || 0,
        q1Budget: dto.q1Budget || 0,
        q2Budget: dto.q2Budget || 0,
        q3Budget: dto.q3Budget || 0,
        q4Budget: dto.q4Budget || 0,
        status: 'DRAFT',
        createdById: userId,
      },
      include: { lines: true, history: { include: { user: { select: { id: true, fullName: true } } } } },
    });

    // Record creation in history
    await this.prisma.aWPBHistory.create({
      data: {
        awpbId: awpb.id,
        action: 'CREATED',
        toStatus: 'DRAFT',
        userId,
        comments: 'AWPB created',
      },
    });

    return awpb;
  }

  // ── Find All ─────────────────────────────────────────────────────────────
  async findAll(filters?: { status?: string; financialYear?: string; district?: string }) {
    const where: any = {};
    if (filters?.status && filters.status !== 'ALL') where.status = filters.status;
    if (filters?.financialYear) where.financialYear = filters.financialYear;
    if (filters?.district) where.district = filters.district;

    return this.prisma.aWPB.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true } },
        _count: { select: { lines: true } },
      },
    });
  }

  // ── Find One ─────────────────────────────────────────────────────────────
  async findOne(id: number) {
    const awpb = await this.prisma.aWPB.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, role: true, department: true } },
        lines: {
          orderBy: { sortOrder: 'asc' },
          include: {
            component: { select: { id: true, name: true, code: true } },
            subComponent: { select: { id: true, name: true, code: true } },
          },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, fullName: true, role: true } } },
        },
      },
    });
    if (!awpb) throw new NotFoundException('AWPB not found');
    return awpb;
  }

  // ── Update basic fields (only in DRAFT / RETURNED) ───────────────────────
  async update(id: number, dto: any, userId: number) {
    const awpb = await this.prisma.aWPB.findUnique({ where: { id } });
    if (!awpb) throw new NotFoundException('AWPB not found');
    if (!['DRAFT', 'RETURNED'].includes(awpb.status)) {
      throw new ForbiddenException('Can only edit AWPB in DRAFT or RETURNED status');
    }

    return this.prisma.aWPB.update({
      where: { id },
      data: {
        title: dto.title,
        district: dto.district || null,
        department: dto.department || null,
        remarks: dto.remarks || null,
        totalBudget: dto.totalBudget || 0,
        q1Budget: dto.q1Budget || 0,
        q2Budget: dto.q2Budget || 0,
        q3Budget: dto.q3Budget || 0,
        q4Budget: dto.q4Budget || 0,
      },
      include: { lines: true },
    });
  }

  // ── Add / Update budget lines ─────────────────────────────────────────────
  async upsertLines(awpbId: number, lines: any[], userId: number) {
    const awpb = await this.prisma.aWPB.findUnique({ where: { id: awpbId } });
    if (!awpb) throw new NotFoundException('AWPB not found');
    if (!['DRAFT', 'RETURNED'].includes(awpb.status)) {
      throw new ForbiddenException('Can only edit lines in DRAFT or RETURNED status');
    }

    // Delete existing lines and recreate
    await this.prisma.aWPBLine.deleteMany({ where: { awpbId } });

    const created = await this.prisma.aWPBLine.createMany({
      data: lines.map((l, i) => ({
        awpbId,
        activityName: l.activityName,
        unit: l.unit || null,
        quantity: l.quantity || 0,
        unitCost: l.unitCost || 0,
        totalCost: (l.quantity || 0) * (l.unitCost || 0),
        q1Target: l.q1Target || 0,
        q2Target: l.q2Target || 0,
        q3Target: l.q3Target || 0,
        q4Target: l.q4Target || 0,
        q1Budget: l.q1Budget || 0,
        q2Budget: l.q2Budget || 0,
        q3Budget: l.q3Budget || 0,
        q4Budget: l.q4Budget || 0,
        remarks: l.remarks || null,
        componentId: l.componentId || null,
        subComponentId: l.subComponentId || null,
        sortOrder: i,
      })),
    });

    // Recalculate total budget from lines
    const totals = await this.prisma.aWPBLine.aggregate({
      where: { awpbId },
      _sum: { q1Budget: true, q2Budget: true, q3Budget: true, q4Budget: true, totalCost: true },
    });

    await this.prisma.aWPB.update({
      where: { id: awpbId },
      data: {
        q1Budget: totals._sum.q1Budget || 0,
        q2Budget: totals._sum.q2Budget || 0,
        q3Budget: totals._sum.q3Budget || 0,
        q4Budget: totals._sum.q4Budget || 0,
        totalBudget: totals._sum.totalCost || 0,
      },
    });

    return { count: created.count };
  }

  // ── Stage Transition ──────────────────────────────────────────────────────
  async transition(id: number, action: 'APPROVE' | 'REJECT' | 'RETURN', comments: string, userId: number, userRole: UserRole) {
    const awpb = await this.prisma.aWPB.findUnique({ where: { id } });
    if (!awpb) throw new NotFoundException('AWPB not found');

    const allowedRoles = STAGE_APPROVERS[awpb.status];
    if (!allowedRoles || !allowedRoles.includes(userRole)) {
      throw new ForbiddenException(`Your role cannot act on AWPB in ${awpb.status} stage`);
    }

    const transitions = STAGE_TRANSITIONS[awpb.status];
    let newStatus: AWPBStatus;

    if (action === 'APPROVE') {
      if (!transitions?.next) throw new BadRequestException('No next stage defined');
      newStatus = transitions.next as AWPBStatus;
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
    } else { // RETURN
      if (!transitions?.prev) throw new BadRequestException('Cannot return from this stage');
      newStatus = 'RETURNED';
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.aWPB.update({
        where: { id },
        data: {
          status: newStatus,
          submittedAt: action === 'APPROVE' && awpb.status === 'DRAFT' ? new Date() : undefined,
          approvedAt: newStatus === 'DAP_APPROVED' ? new Date() : undefined,
        },
        include: {
          lines: true,
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { user: { select: { id: true, fullName: true } } },
          },
        },
      }),
      this.prisma.aWPBHistory.create({
        data: {
          awpbId: id,
          action,
          fromStatus: awpb.status,
          toStatus: newStatus,
          comments: comments || null,
          userId,
        },
      }),
    ]);

    return updated;
  }

  // ── Summary for dashboard ─────────────────────────────────────────────────
  async getSummary() {
    const byStatus = await this.prisma.aWPB.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { totalBudget: true },
    });

    return byStatus.map(s => ({
      status: s.status,
      label: STAGE_LABELS[s.status],
      count: s._count.status,
      totalBudget: s._sum.totalBudget || 0,
    }));
  }
}
