import { Injectable } from '@nestjs/common';
import { ApprovalStatus, PriorityLevel } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateApprovalDto } from './dto/create-approval.dto';

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createApprovalDto: CreateApprovalDto, requestedById?: number) {
    return this.prisma.approval.create({
      data: {
        title: createApprovalDto.title,
        referenceNo: createApprovalDto.referenceNo,
        entityType: createApprovalDto.entityType,
        department: createApprovalDto.department,
        priority: createApprovalDto.priority ?? PriorityLevel.MEDIUM,
        remarks: createApprovalDto.remarks,
        dueDate: createApprovalDto.dueDate ? new Date(createApprovalDto.dueDate) : undefined,
        entityId: createApprovalDto.entityId,
        projectId: createApprovalDto.projectId,
        requestedById,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.approval.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async updateStatus(
    id: number,
    status: ApprovalStatus,
    reviewedById?: number,
    priority?: PriorityLevel,
    remarks?: string,
  ) {
    return this.prisma.approval.update({
      where: { id },
      data: {
        status,
        priority,
        remarks,
        reviewedById,
        decisionAt: status === ApprovalStatus.PENDING ? null : new Date(),
      },
      include: {
        reviewedBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async getSummary() {
    const [statusBreakdown, priorityBreakdown, departmentBreakdown] = await Promise.all([
      this.prisma.approval.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.approval.groupBy({ by: ['priority'], _count: { priority: true } }),
      this.prisma.approval.groupBy({ by: ['department'], _count: { department: true } }),
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
    };
  }
}
