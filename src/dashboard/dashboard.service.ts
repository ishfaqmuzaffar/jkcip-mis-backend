import { Injectable } from '@nestjs/common';
import {
  ApprovalStatus,
  BeneficiaryStatus,
  PriorityLevel,
  ProjectStatus,
  SchemeStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalSchemes,
      activeSchemes,
      totalProjects,
      ongoingProjects,
      completedProjects,
      totalBeneficiaries,
      supportedBeneficiaries,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
      criticalApprovals,
      schemeFinancials,
      projectFinancials,
      beneficiaryFinancials,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'INACTIVE' } }),
      this.prisma.scheme.count(),
      this.prisma.scheme.count({ where: { status: SchemeStatus.ACTIVE } }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: ProjectStatus.ONGOING } }),
      this.prisma.project.count({ where: { status: ProjectStatus.COMPLETED } }),
      this.prisma.beneficiary.count(),
      this.prisma.beneficiary.count({ where: { status: BeneficiaryStatus.SUPPORTED } }),
      this.prisma.approval.count({ where: { status: ApprovalStatus.PENDING } }),
      this.prisma.approval.count({ where: { status: ApprovalStatus.APPROVED } }),
      this.prisma.approval.count({ where: { status: ApprovalStatus.REJECTED } }),
      this.prisma.approval.count({ where: { priority: PriorityLevel.CRITICAL } }),
      this.prisma.scheme.aggregate({
        _sum: { budget: true, utilizedBudget: true, targetBeneficiaries: true, achievedBeneficiaries: true },
      }),
      this.prisma.project.aggregate({
        _sum: { budget: true, utilizedBudget: true, targetCount: true, achievedCount: true, beneficiaryCount: true },
      }),
      this.prisma.beneficiary.aggregate({ _sum: { sanctionedAmount: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalSchemes,
      activeSchemes,
      totalProjects,
      ongoingProjects,
      completedProjects,
      totalBeneficiaries,
      supportedBeneficiaries,
      pendingApprovals,
      approvedApprovals,
      rejectedApprovals,
      criticalApprovals,
      finances: {
        schemeBudget: schemeFinancials._sum.budget ?? 0,
        schemeUtilizedBudget: schemeFinancials._sum.utilizedBudget ?? 0,
        projectBudget: projectFinancials._sum.budget ?? 0,
        projectUtilizedBudget: projectFinancials._sum.utilizedBudget ?? 0,
        totalSanctionedAmount: beneficiaryFinancials._sum.sanctionedAmount ?? 0,
      },
      targets: {
        schemeTargetBeneficiaries: schemeFinancials._sum.targetBeneficiaries ?? 0,
        schemeAchievedBeneficiaries: schemeFinancials._sum.achievedBeneficiaries ?? 0,
        projectTargetCount: projectFinancials._sum.targetCount ?? 0,
        projectAchievedCount: projectFinancials._sum.achievedCount ?? 0,
        projectBeneficiaryCount: projectFinancials._sum.beneficiaryCount ?? 0,
      },
    };
  }

  async getOverview() {
    const [schemesByStatus, projectsByStatus, approvalsByStatus, beneficiariesByStatus, projectPriorityMix] =
      await Promise.all([
        this.groupCountsBySchemeStatus(),
        this.groupCountsByProjectStatus(),
        this.groupCountsByApprovalStatus(),
        this.groupCountsByBeneficiaryStatus(),
        this.groupCountsByProjectPriority(),
      ]);

    return {
      schemesByStatus,
      projectsByStatus,
      approvalsByStatus,
      beneficiariesByStatus,
      projectPriorityMix,
    };
  }

  async getRecentActivity() {
    const [schemes, projects, beneficiaries, approvals] = await Promise.all([
      this.prisma.scheme.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, code: true, status: true, department: true, createdAt: true },
      }),
      this.prisma.project.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, code: true, status: true, department: true, district: true, createdAt: true },
      }),
      this.prisma.beneficiary.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          referenceNumber: true,
          status: true,
          district: true,
          isYouth: true,
          isWoman: true,
          isBpl: true,
          createdAt: true,
        },
      }),
      this.prisma.approval.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, referenceNo: true, status: true, department: true, createdAt: true },
      }),
    ]);

    return { schemes, projects, beneficiaries, approvals };
  }

  async getDistrictPerformance() {
    const [projectRows, beneficiaryRows] = await Promise.all([
      this.prisma.project.findMany({
        select: {
          district: true,
          budget: true,
          utilizedBudget: true,
          targetCount: true,
          achievedCount: true,
          beneficiaryCount: true,
          status: true,
        },
      }),
      this.prisma.beneficiary.findMany({
        select: {
          district: true,
          isYouth: true,
          isWoman: true,
          isBpl: true,
          isGeneral: true,
          sanctionedAmount: true,
        },
      }),
    ]);

    const districtMap = new Map<string, any>();

    for (const row of projectRows) {
      const key = row.district || 'Unknown';
      if (!districtMap.has(key)) {
        districtMap.set(key, this.createDistrictBucket(key));
      }
      const bucket = districtMap.get(key);
      bucket.totalProjects += 1;
      bucket.totalBudget += row.budget;
      bucket.utilizedBudget += row.utilizedBudget;
      bucket.targetCount += row.targetCount;
      bucket.achievedCount += row.achievedCount;
      bucket.projectBeneficiaries += row.beneficiaryCount;
      if (row.status === ProjectStatus.ONGOING) bucket.ongoingProjects += 1;
      if (row.status === ProjectStatus.COMPLETED) bucket.completedProjects += 1;
    }

    for (const row of beneficiaryRows) {
      const key = row.district || 'Unknown';
      if (!districtMap.has(key)) {
        districtMap.set(key, this.createDistrictBucket(key));
      }
      const bucket = districtMap.get(key);
      bucket.totalBeneficiaries += 1;
      bucket.sanctionedAmount += row.sanctionedAmount;
      bucket.youth += row.isYouth ? 1 : 0;
      bucket.women += row.isWoman ? 1 : 0;
      bucket.bpl += row.isBpl ? 1 : 0;
      bucket.general += row.isGeneral ? 1 : 0;
    }

    return Array.from(districtMap.values())
      .map((item) => ({
        ...item,
        utilizationPercent: this.toPercent(item.utilizedBudget, item.totalBudget),
        achievementPercent: this.toPercent(item.achievedCount, item.targetCount),
      }))
      .sort((a, b) => b.totalProjects - a.totalProjects || a.district.localeCompare(b.district));
  }

  async getQuotaSummary() {
    const [total, youth, women, bpl, general] = await Promise.all([
      this.prisma.beneficiary.count(),
      this.prisma.beneficiary.count({ where: { isYouth: true } }),
      this.prisma.beneficiary.count({ where: { isWoman: true } }),
      this.prisma.beneficiary.count({ where: { isBpl: true } }),
      this.prisma.beneficiary.count({ where: { isGeneral: true } }),
    ]);

    return {
      totalBeneficiaries: total,
      youth: { count: youth, percent: this.toPercent(youth, total) },
      women: { count: women, percent: this.toPercent(women, total) },
      bpl: { count: bpl, percent: this.toPercent(bpl, total) },
      general: { count: general, percent: this.toPercent(general, total) },
    };
  }

  private async groupCountsBySchemeStatus() {
    const rows = await this.prisma.scheme.groupBy({ by: ['status'], _count: { status: true } });
    return this.toCountMap(rows, ['DRAFT', 'ACTIVE', 'CLOSED']);
  }

  private async groupCountsByProjectStatus() {
    const rows = await this.prisma.project.groupBy({ by: ['status'], _count: { status: true } });
    return this.toCountMap(rows, ['PLANNED', 'ONGOING', 'COMPLETED', 'ON_HOLD']);
  }

  private async groupCountsByApprovalStatus() {
    const rows = await this.prisma.approval.groupBy({ by: ['status'], _count: { status: true } });
    return this.toCountMap(rows, ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED']);
  }

  private async groupCountsByBeneficiaryStatus() {
    const rows = await this.prisma.beneficiary.groupBy({ by: ['status'], _count: { status: true } });
    return this.toCountMap(rows, ['IDENTIFIED', 'VERIFIED', 'APPROVED', 'SUPPORTED']);
  }

  private async groupCountsByProjectPriority() {
    const rows = await this.prisma.project.groupBy({ by: ['priority'], _count: { priority: true } });
    return this.toCountMap(rows, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'priority');
  }

  private toCountMap(
    rows: Array<Record<string, any>>,
    keys: string[],
    fieldName = 'status',
  ): Record<string, number> {
    const result: Record<string, number> = {};
    for (const key of keys) {
      result[key] = 0;
    }
    for (const row of rows) {
      const key = row[fieldName] as string;
      result[key] = row._count?.[fieldName] ?? 0;
    }
    return result;
  }

  private createDistrictBucket(district: string) {
    return {
      district,
      totalProjects: 0,
      ongoingProjects: 0,
      completedProjects: 0,
      totalBudget: 0,
      utilizedBudget: 0,
      targetCount: 0,
      achievedCount: 0,
      projectBeneficiaries: 0,
      totalBeneficiaries: 0,
      youth: 0,
      women: 0,
      bpl: 0,
      general: 0,
      sanctionedAmount: 0,
    };
  }

  private toPercent(value: number, total: number) {
    if (!total) {
      return 0;
    }
    return Number(((value / total) * 100).toFixed(2));
  }
}
