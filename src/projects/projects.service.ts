import { Injectable } from '@nestjs/common';
import { PriorityLevel, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, createdById?: number) {
    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        code: createProjectDto.code,
        description: createProjectDto.description,
        department: createProjectDto.department,
        district: createProjectDto.district,
        block: createProjectDto.block,
        village: createProjectDto.village,
        status: createProjectDto.status ?? ProjectStatus.PLANNED,
        priority: createProjectDto.priority ?? PriorityLevel.MEDIUM,
        budget: createProjectDto.budget ?? 0,
        utilizedBudget: createProjectDto.utilizedBudget ?? 0,
        targetCount: createProjectDto.targetCount ?? 0,
        achievedCount: createProjectDto.achievedCount ?? 0,
        beneficiaryCount: createProjectDto.beneficiaryCount ?? 0,
        schemeId: createProjectDto.schemeId,
        latitude: createProjectDto.latitude,
        longitude: createProjectDto.longitude,
        startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : undefined,
        endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : undefined,
        createdById,
      },
      include: {
        scheme: true,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        scheme: {
          select: { id: true, title: true, code: true },
        },
        _count: {
          select: { approvals: true, beneficiaries: true },
        },
      },
    });
  }

  async updateStatus(
    id: number,
    status?: ProjectStatus,
    priority?: PriorityLevel,
    description?: string,
    utilizedBudget?: number,
    achievedCount?: number,
  ) {
    return this.prisma.project.update({
      where: { id },
      data: {
        status,
        priority,
        description,
        utilizedBudget,
        achievedCount,
      },
    });
  }

  async getSummary() {
    const [statusBreakdown, priorityBreakdown, departmentBreakdown, districtBreakdown, financials] = await Promise.all([
      this.prisma.project.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.project.groupBy({ by: ['priority'], _count: { priority: true } }),
      this.prisma.project.groupBy({ by: ['department'], _count: { department: true } }),
      this.prisma.project.groupBy({ by: ['district'], _count: { district: true } }),
      this.prisma.project.aggregate({
        _sum: {
          budget: true,
          utilizedBudget: true,
          targetCount: true,
          achievedCount: true,
          beneficiaryCount: true,
        },
      }),
    ]);

    return {
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      priorityBreakdown: priorityBreakdown.map((item) => ({
        priority: item.priority,
        count: item._count.priority,
      })),
      departmentBreakdown: departmentBreakdown.map((item) => ({
        department: item.department,
        count: item._count.department,
      })),
      districtBreakdown: districtBreakdown.map((item) => ({
        district: item.district || 'Unknown',
        count: item._count.district,
      })),
      financials: {
        totalBudget: financials._sum.budget ?? 0,
        utilizedBudget: financials._sum.utilizedBudget ?? 0,
        targetCount: financials._sum.targetCount ?? 0,
        achievedCount: financials._sum.achievedCount ?? 0,
        beneficiaryCount: financials._sum.beneficiaryCount ?? 0,
      },
    };
  }
}
