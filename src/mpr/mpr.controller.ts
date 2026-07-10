import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query, UseGuards, Request,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { MprService } from './mpr.service';
import { DEPARTMENTS } from './mpr.mapping';

@Controller('mpr')
@UseGuards(JwtAuthGuard)
export class MprController {
  constructor(private readonly mprService: MprService) {}

  // GET /api/mpr/status — last fetch per dept + pending conflicts count
  @Get('status')
  getStatus() {
    return this.mprService.getStatus();
  }

  // GET /api/mpr/departments — list of all configured departments
  @Get('departments')
  getDepartments() {
    return Object.entries(DEPARTMENTS).map(([code, cfg]) => ({
      code,
      name: cfg.name,
      tabs: cfg.tabs,
    }));
  }

  // POST /api/mpr/fetch — trigger fetch for all departments
  @Post('fetch')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  fetchAll() {
    return this.mprService.fetchAll('manual');
  }

  // POST /api/mpr/fetch/:dept — trigger fetch for one department
  @Post('fetch/:dept')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  fetchDept(
    @Param('dept') dept: string,
    @Body('tab') tab?: string,
  ) {
    const config = DEPARTMENTS[dept.toUpperCase()];
    if (!config) throw new Error(`Unknown department: ${dept}`);
    const tabName = tab ?? config.tabs[0];
    return this.mprService.fetchDepartment(dept.toUpperCase(), config, tabName, 'manual');
  }

  // GET /api/mpr/conflicts — list pending conflicts for PMU review
  @Get('conflicts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getConflicts(@Query('resolved') resolved?: string) {
    return this.mprService.getConflicts(resolved === 'true');
  }

  // PATCH /api/mpr/conflicts/:id/resolve — PMU resolves a conflict
  @Patch('conflicts/:id/resolve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  resolveConflict(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      resolution: 'mpr' | 'mis' | 'override';
      overrideValue?: number;
      remarks?: string;
    },
    @Request() req: any,
  ) {
    return this.mprService.resolveConflict(
      id,
      body.resolution,
      req.user.id,
      body.overrideValue,
      body.remarks,
    );
  }
}
