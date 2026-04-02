import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';
import { UpdateProjectStatusDto } from './dto/update-project-status.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('summary')
  getSummary() {
    return this.projectsService.getSummary();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  create(@Body() createProjectDto: CreateProjectDto, @Req() req: any) {
    return this.projectsService.create(createProjectDto, req.user?.userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(
      id,
      updateDto.status,
      updateDto.priority,
      updateDto.description,
      updateDto.utilizedBudget,
      updateDto.achievedCount,
    );
  }
}
