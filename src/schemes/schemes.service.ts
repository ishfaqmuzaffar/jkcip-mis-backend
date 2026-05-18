import { Injectable } from '@nestjs/common';
import { SchemeStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSchemeDto } from './dto/create-scheme.dto';
import { UpdateSchemeDto } from './dto/update-scheme.dto';

@Injectable()
export class SchemesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSchemeDto: CreateSchemeDto, createdById?: number) {
    return this.prisma.scheme.create({
      data: {
        title: createSchemeDto.title,
        code: createSchemeDto.code,
        description: createSchemeDto.description,
        department: createSchemeDto.department,
        budget: createSchemeDto.budget ?? 0,
        utilizedBudget: createSchemeDto.utilizedBudget ?? 0,
        targetBeneficiaries: createSchemeDto.targetBeneficiaries ?? 0,
        achievedBeneficiaries: createSchemeDto.achievedBeneficiaries ?? 0,
        startDate: createSchemeDto.startDate ? new Date(createSchemeDto.startDate) : undefined,
        endDate: createSchemeDto.endDate ? new Date(createSchemeDto.endDate) : undefined,
        subComponentId: createSchemeDto.subComponentId ?? null,  // ← NEW
        createdById,
      },
      include: {
        subComponent: {
          include: { component: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  // ← NEW: general update method
  async update(id: number, dto: UpdateSchemeDto) {
    return this.prisma.scheme.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
        ...(dto.utilizedBudget !== undefined && { utilizedBudget: dto.utilizedBudget }),
        ...(dto.targetBeneficiaries !== undefined && { targetBeneficiaries: dto.targetBeneficiaries }),
        ...(dto.achievedBeneficiaries !== undefined && { achievedBeneficiaries: dto.achievedBeneficiaries }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        // subComponentId: set to value, or null to unassign
        ...(dto.subComponentId !== undefined && {
          subComponentId: dto.subComponentId ?? null,
        }),
      },
      include: {
        subComponent: {
          include: { component: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.scheme.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subComponent: {                   // ← NEW: include component hierarchy
          include: { component: true },
        },
        _count: {
          select: { projects: true, beneficiaries: true },
        },
      },
    });
  }

  async updateStatus(id: number, status: SchemeStatus, description?: string) {
    return this.prisma.scheme.update({
      where: { id },
      data: {
        status,
        description,
      },
    });
  }

  async getSummary() {
    const [statusBreakdown, departmentBreakdown, financials] = await Promise.all([
      this.prisma.scheme.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.scheme.groupBy({ by: ['department'], _count: { department: true } }),
      this.prisma.scheme.aggregate({
        _sum: {
          budget: true,
          utilizedBudget: true,
          targetBeneficiaries: true,
          achievedBeneficiaries: true,
        },
      }),
    ]);

    return {
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      departmentBreakdown: departmentBreakdown.map((item) => ({
        department: item.department,
        count: item._count.department,
      })),
      financials: {
        totalBudget: financials._sum.budget ?? 0,
        utilizedBudget: financials._sum.utilizedBudget ?? 0,
        targetBeneficiaries: financials._sum.targetBeneficiaries ?? 0,
        achievedBeneficiaries: financials._sum.achievedBeneficiaries ?? 0,
      },
    };
  }
}