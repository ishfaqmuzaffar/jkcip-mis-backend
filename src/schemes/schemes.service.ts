import { Injectable } from '@nestjs/common';
import { SchemeStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateSchemeDto } from './dto/create-scheme.dto';

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
        startDate: createSchemeDto.startDate ? new Date(createSchemeDto.startDate) : undefined,
        endDate: createSchemeDto.endDate ? new Date(createSchemeDto.endDate) : undefined,
        createdById,
      },
      include: {
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
    const [statusBreakdown, departmentBreakdown] = await Promise.all([
      this.prisma.scheme.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.scheme.groupBy({ by: ['department'], _count: { department: true } }),
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
    };
  }
}
