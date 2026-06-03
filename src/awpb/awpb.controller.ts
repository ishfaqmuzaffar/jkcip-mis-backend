import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { AWPBService } from './awpb.service';

@Controller('awpb')
@UseGuards(JwtAuthGuard)
export class AWPBController {
  constructor(private readonly awpbService: AWPBService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('financialYear') financialYear?: string,
    @Query('district') district?: string,
  ) {
    return this.awpbService.findAll({ status, financialYear, district });
  }

  @Get('summary')
  getSummary() {
    return this.awpbService.getSummary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.awpbService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  create(@Body() dto: any, @Req() req: any) {
    return this.awpbService.create(dto, req.user?.userId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    return this.awpbService.update(id, dto, req.user?.userId);
  }

  // Save all budget lines at once
  @Put(':id/lines')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  upsertLines(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { lines: any[] },
    @Req() req: any,
  ) {
    return this.awpbService.upsertLines(id, body.lines, req.user?.userId);
  }

  // Approve / Reject / Return
  @Post(':id/transition')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  transition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { action: 'APPROVE' | 'REJECT' | 'RETURN'; comments: string },
    @Req() req: any,
  ) {
    return this.awpbService.transition(id, body.action, body.comments, req.user?.userId, req.user?.role);
  }
}
