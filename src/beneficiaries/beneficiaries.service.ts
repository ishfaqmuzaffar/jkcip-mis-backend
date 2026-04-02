import { Injectable } from '@nestjs/common';
import { BeneficiaryStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBeneficiaryDto: CreateBeneficiaryDto) {
    return this.prisma.beneficiary.create({
      data: {
        fullName: createBeneficiaryDto.fullName,
        referenceNumber: createBeneficiaryDto.referenceNumber,
        gender: createBeneficiaryDto.gender,
        age: createBeneficiaryDto.age,
        district: createBeneficiaryDto.district,
        block: createBeneficiaryDto.block,
        village: createBeneficiaryDto.village,
        isYouth: createBeneficiaryDto.isYouth ?? false,
        isWoman: createBeneficiaryDto.isWoman ?? false,
        isBpl: createBeneficiaryDto.isBpl ?? false,
        isGeneral: createBeneficiaryDto.isGeneral ?? false,
        phone: createBeneficiaryDto.phone,
        remarks: createBeneficiaryDto.remarks,
        sanctionedAmount: createBeneficiaryDto.sanctionedAmount ?? 0,
        schemeId: createBeneficiaryDto.schemeId,
        projectId: createBeneficiaryDto.projectId,
        approvedAt: createBeneficiaryDto.approvedAt ? new Date(createBeneficiaryDto.approvedAt) : undefined,
      },
      include: {
        scheme: { select: { id: true, title: true, code: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.beneficiary.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        scheme: { select: { id: true, title: true, code: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateStatus(id: number, status: BeneficiaryStatus, remarks?: string) {
    return this.prisma.beneficiary.update({
      where: { id },
      data: {
        status,
        remarks,
        approvedAt:
          status === BeneficiaryStatus.APPROVED || status === BeneficiaryStatus.SUPPORTED
            ? new Date()
            : undefined,
      },
    });
  }

  async getSummary() {
    const [statusBreakdown, districtBreakdown, categoryCounts, financials] = await Promise.all([
      this.prisma.beneficiary.groupBy({ by: ['status'], _count: { status: true } }),
      this.prisma.beneficiary.groupBy({ by: ['district'], _count: { district: true } }),
      Promise.all([
        this.prisma.beneficiary.count({ where: { isYouth: true } }),
        this.prisma.beneficiary.count({ where: { isWoman: true } }),
        this.prisma.beneficiary.count({ where: { isBpl: true } }),
        this.prisma.beneficiary.count({ where: { isGeneral: true } }),
      ]),
      this.prisma.beneficiary.aggregate({ _sum: { sanctionedAmount: true } }),
    ]);

    return {
      statusBreakdown: statusBreakdown.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      districtBreakdown: districtBreakdown.map((item) => ({
        district: item.district || 'Unknown',
        count: item._count.district,
      })),
      categoryBreakdown: {
        youth: categoryCounts[0],
        women: categoryCounts[1],
        bpl: categoryCounts[2],
        general: categoryCounts[3],
      },
      totalSanctionedAmount: financials._sum.sanctionedAmount ?? 0,
    };
  }
}
