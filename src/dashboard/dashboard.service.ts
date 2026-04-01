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
        select: { id: true, name: true, code: true, status: true, department: true, createdAt: true },
      }),
      this.prisma.beneficiary.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, fullName: true, referenceNumber: true, status: true, district: true, createdAt: true },
      }),
      this.prisma.approval.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, referenceNo: true, status: true, department: true, createdAt: true },
      }),
    ]);

    return { schemes, projects, beneficiaries, approvals };
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
}
