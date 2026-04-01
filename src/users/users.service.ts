import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    fullName: string;
    email: string;
    password: string;
    role?: UserRole;
    department?: string;
    phone?: string;
  }) {
    return this.prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role || UserRole.VIEWER,
        department: data.department,
        phone: data.phone,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async getSummary() {
    const [roles, departments] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      this.prisma.user.groupBy({ by: ['department'], _count: { department: true } }),
    ]);

    return {
      roles: roles.map((item) => ({ role: item.role, count: item._count.role })),
      departments: departments.map((item) => ({
        department: item.department || 'Unassigned',
        count: item._count.department,
      })),
    };
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
        department: true,
        phone: true,
        createdAt: true,
      },
    });
  }

  async updateStatus(id: number, status: UserStatus) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }
}
