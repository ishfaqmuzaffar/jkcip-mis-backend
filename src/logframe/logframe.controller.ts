import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { CreateIndicatorDto } from './dto/create-indicator.dto';
import { CreateLogframeNodeDto } from './dto/create-logframe-node.dto';
import { UpdateIndicatorDto } from './dto/update-indicator.dto';
import { UpdateLogframeNodeDto } from './dto/update-logframe-node.dto';
import { UpsertIndicatorProgressDto } from './dto/upsert-indicator-progress.dto';
import { LogframeService } from './logframe.service';

@Controller('logframe')
@UseGuards(JwtAuthGuard)
export class LogframeController {
  constructor(private readonly logframeService: LogframeService) {}

  @Get('tree')
  getTree() {
    return this.logframeService.getTree();
  }

  @Get('nodes')
  getNodes() {
    return this.logframeService.getNodes();
  }

  @Post('nodes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  createNode(@Body() dto: CreateLogframeNodeDto) {
    return this.logframeService.createNode(dto);
  }

  @Patch('nodes/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateNode(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLogframeNodeDto) {
    return this.logframeService.updateNode(id, dto);
  }

  @Get('indicators')
  getIndicators(
    @Query('nodeId') nodeId?: string,
    @Query('department') department?: string,
    @Query('sector') sector?: string,
    @Query('crop') crop?: string,
    @Query('year') year?: string,
  ) {
    return this.logframeService.getIndicators({
      nodeId: nodeId ? Number(nodeId) : undefined,
      department,
      sector,
      crop,
      year: year ? Number(year) : undefined,
    });
  }

  @Get('indicators/:id')
  getIndicator(@Param('id', ParseIntPipe) id: number) {
    return this.logframeService.getIndicator(id);
  }

  @Post('indicators')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  createIndicator(@Body() dto: CreateIndicatorDto) {
    return this.logframeService.createIndicator(dto);
  }

  @Patch('indicators/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateIndicator(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIndicatorDto) {
    return this.logframeService.updateIndicator(id, dto);
  }

  @Get('indicators/:id/progress')
  getIndicatorProgress(
    @Param('id', ParseIntPipe) id: number,
    @Query('year') year?: string,
  ) {
    return this.logframeService.getIndicatorProgress(id, year ? Number(year) : undefined);
  }

  @Post('indicators/:id/progress')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  upsertIndicatorProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpsertIndicatorProgressDto,
    @Req() req: any,
  ) {
    return this.logframeService.upsertIndicatorProgress(id, dto, req.user?.userId);
  }



  @Post('import/preview')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file'))
  previewImport(@UploadedFile() file?: any) {
    if (!file) {
      throw new BadRequestException('Please upload a CSV or XLSX file.');
    }
    return this.logframeService.previewImport(file.buffer, file.originalname);
  }

  @Post('import/commit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  @UseInterceptors(FileInterceptor('file'))
  commitImport(@UploadedFile() file: any, @Body('mode') mode?: string) {
    if (!file) {
      throw new BadRequestException('Please upload a CSV or XLSX file.');
    }
    const normalizedMode = mode === 'update' ? 'update' : 'skip';
    return this.logframeService.commitImport(file.buffer, file.originalname, normalizedMode);
  }

  @Get('dashboard/summary')
  getDashboardSummary(@Query('year') year?: string) {
    return this.logframeService.getDashboardSummary(year ? Number(year) : undefined);
  }

  @Get('dashboard/outcomes')
  getOutcomePerformance(@Query('year') year?: string) {
    return this.logframeService.getOutcomePerformance(year ? Number(year) : undefined);
  }
}
