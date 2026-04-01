import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { CreateSchemeDto } from './dto/create-scheme.dto';
import { SchemesService } from './schemes.service';
import { UpdateSchemeStatusDto } from './dto/update-scheme-status.dto';

@Controller('schemes')
@UseGuards(JwtAuthGuard)
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get()
  findAll() {
    return this.schemesService.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.schemesService.getSummary();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  create(@Body() createSchemeDto: CreateSchemeDto, @Req() req: any) {
    return this.schemesService.create(createSchemeDto, req.user?.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSchemeStatusDto,
  ) {
    return this.schemesService.updateStatus(id, updateDto.status, updateDto.description);
  }
}
