import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BeneficiaryStatus, ApplicationStatus, BeneficiaryCategory } from '@prisma/client';

// District code map for UHID generation
const DISTRICT_CODES: Record<string, string> = {
  'Srinagar': 'SRN', 'Baramulla': 'BRM', 'Budgam': 'BDG',
  'Anantnag': 'ANT', 'Kulgam': 'KLG', 'Pulwama': 'PLW',
  'Shopian': 'SHP', 'Ganderbal': 'GNL', 'Bandipora': 'BND',
  'Kupwara': 'KPW', 'Jammu': 'JMU', 'Samba': 'SMB',
  'Kathua': 'KTH', 'Udhampur': 'UDH', 'Reasi': 'RSI',
  'Rajouri': 'RJR', 'Poonch': 'PNC', 'Doda': 'DDA',
  'Kishtwar': 'KSW', 'Ramban': 'RMB',
};

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── UHID Generation ──────────────────────────────────────────────────────
  private async generateUHID(district?: string): Promise<string> {
    const year = new Date().getFullYear();
    const distCode = (district && DISTRICT_CODES[district]) ? DISTRICT_CODES[district] : 'UNK';
    const prefix = `JKCIP-${year}-${distCode}-`;

    // Count existing UHIDs with this prefix to get next sequence
    const count = await this.prisma.beneficiary.count({
      where: { uhid: { startsWith: prefix } },
    });

    const seq = String(count + 1).padStart(6, '0');
    return `${prefix}${seq}`;
  }

  // ── Reference Number Generation ──────────────────────────────────────────
  private generateReferenceNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    return `BEN-${year}-${random}`;
  }

  // ── Duplicate Detection ──────────────────────────────────────────────────
  async checkDuplicates(data: {
    fullName?: string;
    aadhaarNumber?: string;
    district?: string;
    village?: string;
    phone?: string;
    excludeId?: number;
  }): Promise<{ isDuplicate: boolean; matches: any[] }> {
    const matches: any[] = [];

    // 1. Check by Aadhaar (definite duplicate)
    if (data.aadhaarNumber) {
      const byAadhaar = await this.prisma.beneficiary.findFirst({
        where: {
          aadhaarNumber: data.aadhaarNumber,
          ...(data.excludeId ? { id: { not: data.excludeId } } : {}),
        },
        select: { id: true, fullName: true, uhid: true, district: true, village: true },
      });
      if (byAadhaar) {
        matches.push({ ...byAadhaar, matchType: 'AADHAAR', confidence: 'HIGH' });
      }
    }

    // 2. Check by name + village + district (likely duplicate)
    if (data.fullName && data.district && data.village) {
      const byLocation = await this.prisma.beneficiary.findFirst({
        where: {
          fullName: { equals: data.fullName, mode: 'insensitive' },
          district: data.district,
          village: { equals: data.village, mode: 'insensitive' },
          ...(data.excludeId ? { id: { not: data.excludeId } } : {}),
        },
        select: { id: true, fullName: true, uhid: true, district: true, village: true },
      });
      if (byLocation && !matches.find(m => m.id === byLocation.id)) {
        matches.push({ ...byLocation, matchType: 'NAME_LOCATION', confidence: 'MEDIUM' });
      }
    }

    // 3. Check by phone (possible duplicate)
    if (data.phone) {
      const byPhone = await this.prisma.beneficiary.findFirst({
        where: {
          phone: data.phone,
          ...(data.excludeId ? { id: { not: data.excludeId } } : {}),
        },
        select: { id: true, fullName: true, uhid: true, district: true, village: true },
      });
      if (byPhone && !matches.find(m => m.id === byPhone.id)) {
        matches.push({ ...byPhone, matchType: 'PHONE', confidence: 'LOW' });
      }
    }

    return { isDuplicate: matches.length > 0, matches };
  }

  // ── Create ───────────────────────────────────────────────────────────────
  async create(dto: any, createdById?: number) {
    // Generate UHID if not provided
    const uhid = dto.uhid || await this.generateUHID(dto.district);

    // Generate referenceNumber if not provided
    const referenceNumber = dto.referenceNumber || this.generateReferenceNumber();

    // Check for duplicates (warn but don't block unless Aadhaar match)
    if (dto.aadhaarNumber) {
      const existing = await this.prisma.beneficiary.findFirst({
        where: { aadhaarNumber: dto.aadhaarNumber },
      });
      if (existing) {
        throw new ConflictException(
          `Duplicate Aadhaar detected. Beneficiary already registered as ${existing.uhid} — ${existing.fullName}`
        );
      }
    }

    return this.prisma.beneficiary.create({
      data: {
        fullName: dto.fullName,
        uhid,
        referenceNumber,
        aadhaarNumber: dto.aadhaarNumber || null,
        gender: dto.gender || null,
        age: dto.age || null,
        phone: dto.phone || null,
        district: dto.district || null,
        block: dto.block || null,
        village: dto.village || null,
        latitude: dto.latitude || null,
        longitude: dto.longitude || null,
        landHolding: dto.landHolding || null,
        landType: dto.landType || null,
        khasraNumber: dto.khasraNumber || null,
        fpoName: dto.fpoName || null,
        fpoMemberId: dto.fpoMemberId || null,
        isYouth: dto.isYouth || false,
        isWoman: dto.isWoman || false,
        isBpl: dto.isBpl || false,
        category: dto.category || 'GENERAL',
        applicationStatus: dto.applicationStatus || 'PENDING',
        status: dto.status || 'IDENTIFIED',
        sanctionedAmount: dto.sanctionedAmount || 0,
        remarks: dto.remarks || null,
        schemeId: dto.schemeId || null,
        projectId: dto.projectId || null,
        createdById: createdById || null,
      },
      include: {
        scheme: { select: { id: true, title: true, code: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  // ── Update ───────────────────────────────────────────────────────────────
  async update(id: number, dto: any) {
    // Check Aadhaar duplicate if changing it
    if (dto.aadhaarNumber) {
      const existing = await this.prisma.beneficiary.findFirst({
        where: { aadhaarNumber: dto.aadhaarNumber, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException(
          `Aadhaar already registered under ${existing.uhid} — ${existing.fullName}`
        );
      }
    }

    const updateData: any = {};
    const fields = [
      'fullName', 'gender', 'age', 'phone', 'aadhaarNumber',
      'district', 'block', 'village', 'latitude', 'longitude',
      'landHolding', 'landType', 'khasraNumber',
      'fpoName', 'fpoMemberId',
      'isYouth', 'isWoman', 'isBpl', 'category',
      'applicationStatus', 'status', 'sanctionedAmount', 'remarks',
      'schemeId', 'projectId',
    ];
    fields.forEach(f => { if (dto[f] !== undefined) updateData[f] = dto[f]; });

    return this.prisma.beneficiary.update({
      where: { id },
      data: updateData,
      include: {
        scheme: { select: { id: true, title: true, code: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  // ── Find All ─────────────────────────────────────────────────────────────
  async findAll(filters?: {
    district?: string;
    status?: string;
    category?: string;
    applicationStatus?: string;
    search?: string;
  }) {
    const where: any = {};
    if (filters?.district) where.district = filters.district;
    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.applicationStatus) where.applicationStatus = filters.applicationStatus;
    if (filters?.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { uhid: { contains: filters.search, mode: 'insensitive' } },
        { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
      ];
    }

    return this.prisma.beneficiary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        scheme: { select: { id: true, title: true, code: true } },
        project: { select: { id: true, name: true } },
      },
    });
  }

  // ── Update Status ────────────────────────────────────────────────────────
  async updateStatus(id: number, status: string) {
    return this.prisma.beneficiary.update({
      where: { id },
      data: { status: status as BeneficiaryStatus },
    });
  }

  // ── Bulk Import ──────────────────────────────────────────────────────────
  async bulkImport(rows: any[], createdById?: number): Promise<{
    imported: number;
    skipped: number;
    errors: { row: number; reason: string; data: any }[];
  }> {
    const errors: { row: number; reason: string; data: any }[] = [];
    const batchId = `BATCH-${Date.now()}`;
    let imported = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        // Validate required fields
        if (!row.fullName?.trim()) {
          errors.push({ row: rowNum, reason: 'fullName is required', data: row });
          skipped++;
          continue;
        }

        // Check Aadhaar duplicate
        if (row.aadhaarNumber) {
          const existing = await this.prisma.beneficiary.findFirst({
            where: { aadhaarNumber: row.aadhaarNumber.trim() },
          });
          if (existing) {
            errors.push({
              row: rowNum,
              reason: `Duplicate Aadhaar — already registered as ${existing.uhid}`,
              data: row,
            });
            skipped++;
            continue;
          }
        }

        // Lookup scheme by code if provided
        let schemeId: number | null = null;
        if (row.schemeCode) {
          const scheme = await this.prisma.scheme.findFirst({
            where: { code: { equals: row.schemeCode.trim(), mode: 'insensitive' } },
          });
          if (scheme) schemeId = scheme.id;
        }

        // Generate UHID
        const uhid = await this.generateUHID(row.district?.trim());
        const referenceNumber = this.generateReferenceNumber();

        await this.prisma.beneficiary.create({
          data: {
            fullName: row.fullName.trim(),
            uhid,
            referenceNumber,
            aadhaarNumber: row.aadhaarNumber?.trim() || null,
            gender: row.gender?.trim() || null,
            age: row.age ? parseInt(row.age) : null,
            phone: row.phone?.trim() || null,
            district: row.district?.trim() || null,
            block: row.block?.trim() || null,
            village: row.village?.trim() || null,
            latitude: row.latitude ? parseFloat(row.latitude) : null,
            longitude: row.longitude ? parseFloat(row.longitude) : null,
            landHolding: row.landHolding ? parseFloat(row.landHolding) : null,
            landType: row.landType?.trim() || null,
            khasraNumber: row.khasraNumber?.trim() || null,
            fpoName: row.fpoName?.trim() || null,
            fpoMemberId: row.fpoMemberId?.trim() || null,
            isYouth: ['yes','y','true','1'].includes(String(row.isYouth || '').toLowerCase()),
            isWoman: ['yes','y','true','1'].includes(String(row.isWoman || '').toLowerCase()),
            isBpl: ['yes','y','true','1'].includes(String(row.isBpl || '').toLowerCase()),
            category: (['SC','ST','OBC','PHH','GENERAL'].includes(row.category?.toUpperCase())
              ? row.category.toUpperCase() : 'GENERAL') as BeneficiaryCategory,
            applicationStatus: (['PENDING','APPROVED','REVERTED'].includes(row.applicationStatus?.toUpperCase())
              ? row.applicationStatus.toUpperCase() : 'PENDING') as ApplicationStatus,
            status: 'IDENTIFIED' as BeneficiaryStatus,
            importBatchId: batchId,
            schemeId,
            createdById: createdById || null,
          },
        });
        imported++;
      } catch (err: any) {
        errors.push({ row: rowNum, reason: err.message || 'Unknown error', data: row });
        skipped++;
      }
    }

    return { imported, skipped, errors };
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  async getSummary() {
    const [total, byStatus, byCategory, byDistrict] = await Promise.all([
      this.prisma.beneficiary.count(),
      this.prisma.beneficiary.groupBy({
        by: ['applicationStatus'],
        _count: { applicationStatus: true },
      }),
      this.prisma.beneficiary.groupBy({
        by: ['category'],
        _count: { category: true },
      }),
      this.prisma.beneficiary.groupBy({
        by: ['district'],
        _count: { district: true },
        orderBy: { _count: { district: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(s => ({ status: s.applicationStatus, count: s._count.applicationStatus })),
      byCategory: byCategory.map(c => ({ category: c.category, count: c._count.category })),
      byDistrict: byDistrict.map(d => ({ district: d.district, count: d._count.district })),
    };
  }
}
