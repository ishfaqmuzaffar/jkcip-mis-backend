import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { UpdateApprovalStatusDto } from './dto/update-approval-status.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  findAll() {
    return this.approvalsService.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.approvalsService.getSummary();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  create(@Body() createApprovalDto: CreateApprovalDto, @Req() req: any) {
    return this.approvalsService.create(createApprovalDto, req.user?.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateApprovalStatusDto,
    @Req() req: any,
  ) {
    return this.approvalsService.updateStatus(
      id,
      updateDto.status,
      req.user?.userId,
      updateDto.priority,
      updateDto.remarks,
    );
  }
}
