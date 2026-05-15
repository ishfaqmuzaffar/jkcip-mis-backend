import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
  UseGuards,
} from '@nestjs/common';
import { ComponentService } from './component.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class ComponentController {
  constructor(private readonly componentService: ComponentService) {}

  // ─── Components ────────────────────────────────────────────────────────────
  @Get('components')
  findAll() {
    return this.componentService.findAll();
  }

  @Get('components/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.componentService.findOne(id);
  }

  @Post('components')
  create(@Body() dto: any) {
    return this.componentService.create(dto);
  }

  @Patch('components/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.componentService.update(id, dto);
  }

  @Delete('components/:id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.componentService.remove(id);
  }

  // ─── Sub-components ────────────────────────────────────────────────────────
  @Get('sub-components')
  findAllSubs(@Query('componentId') componentId?: string) {
    return this.componentService.findAllSubComponents(
      componentId ? parseInt(componentId) : undefined,
    );
  }

  @Post('sub-components')
  createSub(@Body() dto: any) {
    return this.componentService.createSubComponent(dto);
  }

  @Patch('sub-components/:id')
  updateSub(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.componentService.updateSubComponent(id, dto);
  }

  @Delete('sub-components/:id')
  removeSub(@Param('id', ParseIntPipe) id: number) {
    return this.componentService.removeSubComponent(id);
  }

  // ─── Scheme stats ──────────────────────────────────────────────────────────
  @Get('schemes/:id/stats')
  getSchemeStats(@Param('id', ParseIntPipe) id: number) {
    return this.componentService.getSchemeStats(id);
  }
}
