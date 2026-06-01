import {
  Body, Controller, Get, Param, ParseIntPipe,
  Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { BeneficiariesService } from './beneficiaries.service';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(private readonly svc: BeneficiariesService) {}

  @Get()
  findAll(
    @Query('district') district?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('applicationStatus') applicationStatus?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.findAll({ district, status, category, applicationStatus, search });
  }

  @Get('summary')
  getSummary() {
    return this.svc.getSummary();
  }

  // Duplicate check endpoint (call before save)
  @Post('check-duplicate')
  checkDuplicate(@Body() body: any) {
    return this.svc.checkDuplicates(body);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  create(@Body() dto: any, @Req() req: any) {
    return this.svc.create(dto, req.user?.userId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.svc.updateStatus(id, status);
  }

  // Bulk import — accepts array of parsed CSV rows
  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  bulkImport(@Body() body: { rows: any[] }, @Req() req: any) {
    return this.svc.bulkImport(body.rows, req.user?.userId);
  }
}
