import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ComponentService {
  private prisma = new PrismaClient();

  async findAll() {
    return this.prisma.component.findMany({
      include: {
        subComponents: {
          include: {
            schemes: {
              include: {
                _count: { select: { beneficiaries: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: number) {
    const component = await this.prisma.component.findUnique({
      where: { id },
      include: {
        subComponents: {
          include: { schemes: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!component) throw new NotFoundException(`Component #${id} not found`);
    return component;
  }

  async create(dto: any) {
    return this.prisma.component.create({ data: dto });
  }

  async update(id: number, dto: any) {
    return this.prisma.component.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.component.delete({ where: { id } });
  }

  async findAllSubComponents(componentId?: number) {
    return this.prisma.subComponent.findMany({
      where: componentId ? { componentId } : undefined,
      include: {
        component: true,
        schemes: {
          include: {
            beneficiaries: {
              select: { id: true, category: true, applicationStatus: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSubComponent(dto: any) {
    return this.prisma.subComponent.create({
      data: dto,
      include: { component: true },
    });
  }

  async updateSubComponent(id: number, dto: any) {
    return this.prisma.subComponent.update({ where: { id }, data: dto });
  }

  async removeSubComponent(id: number) {
    return this.prisma.subComponent.delete({ where: { id } });
  }

  async getSchemeStats(schemeId: number) {
    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: { schemeId },
      select: { category: true, applicationStatus: true },
    });

    return {
      total: beneficiaries.length,
      approved: beneficiaries.filter(b => b.applicationStatus === 'APPROVED').length,
      pending:  beneficiaries.filter(b => b.applicationStatus === 'PENDING').length,
      reverted: beneficiaries.filter(b => b.applicationStatus === 'REVERTED').length,
      sc:       beneficiaries.filter(b => b.category === 'SC').length,
      st:       beneficiaries.filter(b => b.category === 'ST').length,
      obc:      beneficiaries.filter(b => b.category === 'OBC').length,
      phh:      beneficiaries.filter(b => b.category === 'PHH').length,
      general:  beneficiaries.filter(b => b.category === 'GENERAL').length,
    };
  }
}
