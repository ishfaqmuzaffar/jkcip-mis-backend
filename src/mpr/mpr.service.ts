import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import {
  DEPARTMENTS,
  MPR_ACTIVITY_MAP,
  DepartmentConfig,
  tabToReportMonth,
  reportMonthToFinYear,
} from './mpr.mapping';

interface FetchResult {
  department: string;
  tabName: string;
  reportMonth: string;
  rowsFetched: number;
  rowsMapped: number;
  rowsSkipped: number;
  conflictsFound: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errorMessage?: string;
}

@Injectable()
export class MprService {
  private readonly logger = new Logger(MprService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Scheduled: runs 1st of every month at 2am ────────────────────────────────
  @Cron('0 2 1 * *')
  async scheduledFetch() {
    this.logger.log('Scheduled MPR fetch started');
    await this.fetchAll('scheduler');
  }

  // ── Fetch all departments ─────────────────────────────────────────────────────
  async fetchAll(triggeredBy = 'manual'): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    for (const [deptCode, config] of Object.entries(DEPARTMENTS)) {
      // Always fetch the latest tab (first in list)
      const latestTab = config.tabs[0];
      try {
        const result = await this.fetchDepartment(deptCode, config, latestTab, triggeredBy);
        results.push(result);
      } catch (e) {
        this.logger.error(`Failed to fetch ${deptCode}: ${e.message}`);
        results.push({
          department: deptCode,
          tabName: latestTab,
          reportMonth: tabToReportMonth(latestTab),
          rowsFetched: 0,
          rowsMapped: 0,
          rowsSkipped: 0,
          conflictsFound: 0,
          status: 'FAILED',
          errorMessage: e.message,
        });
      }
    }
    return results;
  }

  // ── Fetch a specific department + tab ─────────────────────────────────────────
  async fetchDepartment(
    deptCode: string,
    config: DepartmentConfig,
    tabName: string,
    triggeredBy = 'manual',
  ): Promise<FetchResult> {
    const reportMonth = tabToReportMonth(tabName);
    const finYear = reportMonthToFinYear(reportMonth);

    this.logger.log(`Fetching ${deptCode} / ${tabName} (${reportMonth})`);

    // Build Google Sheets CSV export URL
    const csvUrl = `https://docs.google.com/spreadsheets/d/${config.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

    let csvText: string;
    try {
      const response = await fetch(csvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JKCIP-MIS/1.0)',
          'Accept': 'text/csv,text/plain,*/*',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      csvText = await response.text();
    } catch (e) {
      throw new Error(`CSV fetch failed: ${e.message}`);
    }

    // Parse CSV
    const rows = this.parseCSV(csvText);
    const dataRows = rows.filter(row => {
      const code = (row[config.codeColumnIndex] ?? '').trim();
      // Skip header rows and empty rows
      return code && code !== 'Code' && !code.startsWith('//') && code.length > 2;
    });

    let rowsMapped = 0;
    let rowsSkipped = 0;
    let conflictsFound = 0;

    // Create fetch log entry
    const fetchLog = await this.prisma.mprFetchLog.create({
      data: {
        department: deptCode,
        sheetId: config.sheetId,
        tabName,
        reportMonth,
        status: 'SUCCESS',
        rowsFetched: dataRows.length,
        rowsMapped: 0,
        rowsSkipped: 0,
        conflictsFound: 0,
        triggeredBy,
      },
    });

    for (const row of dataRows) {
      const activityCode = (row[config.codeColumnIndex] ?? '').trim();
      const rawValue = (row[config.valueColumnIndex] ?? '').trim();

      // Skip rows with no value
      if (!rawValue || rawValue === '' || rawValue === '-') {
        rowsSkipped++;
        continue;
      }

      const value = parseFloat(rawValue.replace(/,/g, ''));
      if (isNaN(value)) { rowsSkipped++; continue; }

      // Look up mapping
      const mapping = MPR_ACTIVITY_MAP[activityCode];
      if (!mapping) {
        rowsSkipped++;
        continue;
      }

      // Find indicator in DB
      const indicator = await this.prisma.indicator.findUnique({
        where: { code: mapping.indicatorCode },
        select: { id: true, name: true },
      });

      if (!indicator) {
        this.logger.warn(`Indicator not found: ${mapping.indicatorCode} (for ${activityCode})`);
        rowsSkipped++;
        continue;
      }

      // Check for existing progress row
      const existing = await this.prisma.indicatorYearProgress.findFirst({
        where: {
          indicatorId: indicator.id,
          reportYear: finYear,
          district: '',
          block: '',
          village: '',
        },
      });

      if (existing && existing.annualResult !== null && existing.annualResult !== value) {
        // Conflict — existing value differs from MPR value
        const activityName = (row[1] ?? activityCode).trim();
        await this.prisma.mprConflict.create({
          data: {
            department: deptCode,
            activityCode,
            activityName,
            indicatorCode: mapping.indicatorCode,
            reportMonth,
            mprValue: value,
            misValue: existing.annualResult,
            unit: mapping.unit,
            fetchLogId: fetchLog.id,
          },
        });
        conflictsFound++;
        rowsMapped++;
        continue;
      }

      // Upsert progress
      await this.prisma.indicatorYearProgress.upsert({
        where: {
          indicatorId_reportYear_district_block_village: {
            indicatorId: indicator.id,
            reportYear: finYear,
            district: '',
            block: '',
            village: '',
          },
        },
        update: {
          annualResult: value,
          cumulativeResult: value,
          evidenceSource: `MPR — ${config.name} (${tabName})`,
          remarks: `Auto-fetched from Google Sheets. Activity: ${activityCode}`,
          lastReportedAt: new Date(),
        },
        create: {
          indicatorId: indicator.id,
          reportYear: finYear,
          annualTarget: null,
          annualResult: value,
          cumulativeResult: value,
          district: '',
          block: '',
          village: '',
          evidenceSource: `MPR — ${config.name} (${tabName})`,
          remarks: `Auto-fetched from Google Sheets. Activity: ${activityCode}`,
          lastReportedAt: new Date(),
        },
      });

      rowsMapped++;
    }

    // Update fetch log with final counts
    await this.prisma.mprFetchLog.update({
      where: { id: fetchLog.id },
      data: {
        rowsMapped,
        rowsSkipped,
        conflictsFound,
        status: rowsMapped === 0 ? 'PARTIAL' : 'SUCCESS',
      },
    });

    return {
      department: deptCode,
      tabName,
      reportMonth,
      rowsFetched: dataRows.length,
      rowsMapped,
      rowsSkipped,
      conflictsFound,
      status: rowsMapped === 0 ? 'PARTIAL' : 'SUCCESS',
    };
  }

  // ── Get fetch status for all departments ──────────────────────────────────────
  async getStatus() {
    const logs = await this.prisma.mprFetchLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { conflicts: true } } },
    });

    // Latest log per department
    const latest: Record<string, any> = {};
    for (const log of logs) {
      if (!latest[log.department]) latest[log.department] = log;
    }

    const pending = await this.prisma.mprConflict.count({
      where: { resolvedAt: null },
    });

    return {
      lastFetchByDept: Object.values(latest),
      pendingConflicts: pending,
      recentLogs: logs.slice(0, 20),
    };
  }

  // ── Get pending conflicts ──────────────────────────────────────────────────────
  async getConflicts(resolved = false) {
    return this.prisma.mprConflict.findMany({
      where: { resolvedAt: resolved ? { not: null } : null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { fetchLog: { select: { department: true, tabName: true } } },
    });
  }

  // ── Resolve a conflict ────────────────────────────────────────────────────────
  async resolveConflict(
    conflictId: number,
    resolution: 'mpr' | 'mis' | 'override',
    resolvedBy: number,
    overrideValue?: number,
    remarks?: string,
  ) {
    const conflict = await this.prisma.mprConflict.findUnique({
      where: { id: conflictId },
    });
    if (!conflict) throw new Error(`Conflict ${conflictId} not found`);

    const finalValue =
      resolution === 'mpr' ? conflict.mprValue :
      resolution === 'mis' ? conflict.misValue :
      (overrideValue ?? conflict.mprValue);

    // If accepting MPR or override — update the indicator
    if (resolution !== 'mis') {
      const indicator = await this.prisma.indicator.findUnique({
        where: { code: conflict.indicatorCode },
        select: { id: true },
      });
      if (indicator) {
        const finYear = reportMonthToFinYear(conflict.reportMonth);
        await this.prisma.indicatorYearProgress.upsert({
          where: {
            indicatorId_reportYear_district_block_village: {
              indicatorId: indicator.id,
              reportYear: finYear,
              district: '',
              block: '',
              village: '',
            },
          },
          update: {
            annualResult: finalValue,
            cumulativeResult: finalValue,
            evidenceSource: `MPR conflict resolved (${resolution})`,
            remarks: remarks ?? `Conflict resolved by user ${resolvedBy}`,
          },
          create: {
            indicatorId: indicator.id,
            reportYear: finYear,
            annualResult: finalValue,
            cumulativeResult: finalValue,
            district: '',
            block: '',
            village: '',
            evidenceSource: `MPR conflict resolved (${resolution})`,
          },
        });
      }
    }

    return this.prisma.mprConflict.update({
      where: { id: conflictId },
      data: {
        resolution,
        resolvedValue: finalValue,
        resolvedAt: new Date(),
        resolvedBy,
        remarks,
      },
    });
  }

  // ── Simple CSV parser (handles quoted fields) ─────────────────────────────────
  private parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const row: string[] = [];
      let inQuote = false;
      let cell = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          row.push(cell); cell = '';
        } else {
          cell += ch;
        }
      }
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }
}
