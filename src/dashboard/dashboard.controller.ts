import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('recent-activity')
  getRecentActivity() {
    return this.dashboardService.getRecentActivity();
  }

  @Get('district-performance')
  getDistrictPerformance() {
    return this.dashboardService.getDistrictPerformance();
  }

  @Get('quota-summary')
  getQuotaSummary() {
    return this.dashboardService.getQuotaSummary();
  }
}
