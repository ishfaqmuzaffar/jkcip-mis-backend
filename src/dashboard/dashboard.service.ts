import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE' },
    });
    const inactiveUsers = await this.prisma.user.count({
      where: { status: 'INACTIVE' },
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalSchemes: 0,
      totalProjects: 0,
      totalBeneficiaries: 0,
      pendingApprovals: 0,
    };
  }
}