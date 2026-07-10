import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import {
  SurveyService,
  CreateRoundDto,
  UpdateRoundDto,
  SubmitResponseDto,
  ReviewIndicatorValueDto,
} from './survey.service';

// SurveyResponseStatus not imported from @prisma/client — not in client until migration runs
type SurveyResponseStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED';

@Controller('surveys')
@UseGuards(JwtAuthGuard)
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  // GET /api/surveys/rounds
  @Get('rounds')
  getRounds() {
    return this.surveyService.getRounds();
  }

  // GET /api/surveys/rounds/:id
  @Get('rounds/:id')
  getRound(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.getRound(id);
  }

  // POST /api/surveys/rounds
  @Post('rounds')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  createRound(@Body() dto: CreateRoundDto) {
    return this.surveyService.createRound(dto);
  }

  // PATCH /api/surveys/rounds/:id
  @Patch('rounds/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateRound(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoundDto) {
    return this.surveyService.updateRound(id, dto);
  }

  // POST /api/surveys/rounds/:id/open
  @Post('rounds/:id/open')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  openRound(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.openRound(id);
  }

  // POST /api/surveys/rounds/:id/close
  @Post('rounds/:id/close')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  closeRound(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.closeRound(id);
  }

  // POST /api/surveys/rounds/:id/confirm
  @Post('rounds/:id/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  confirmRound(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.confirmRound(id);
  }

  // GET /api/surveys/rounds/:id/stats
  @Get('rounds/:id/stats')
  getStats(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.getStats(id);
  }

  // GET /api/surveys/rounds/:id/responses
  @Get('rounds/:id/responses')
  getResponses(
    @Param('id', ParseIntPipe) roundId: number,
    @Query('district') district?: string,
    @Query('block') block?: string,
    @Query('status') status?: SurveyResponseStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.surveyService.getResponses(roundId, {
      district,
      block,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  // GET /api/surveys/responses/:id
  @Get('responses/:id')
  getResponse(@Param('id', ParseIntPipe) id: number) {
    return this.surveyService.getResponse(id);
  }

  // POST /api/surveys/rounds/:id/responses
  @Post('rounds/:id/responses')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  submitResponse(
    @Param('id', ParseIntPipe) roundId: number,
    @Body() dto: SubmitResponseDto,
  ) {
    return this.surveyService.submitResponse(roundId, dto);
  }

  // POST /api/surveys/rounds/:id/responses/bulk-sync
  @Post('rounds/:id/responses/bulk-sync')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DEPARTMENT_OFFICER, UserRole.DATA_ENTRY)
  bulkSync(
    @Param('id', ParseIntPipe) roundId: number,
    @Body() body: { responses: SubmitResponseDto[] },
  ) {
    return this.surveyService.bulkSync(roundId, body.responses);
  }

  // GET /api/surveys/rounds/:id/indicator-values
  @Get('rounds/:id/indicator-values')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getIndicatorValues(@Param('id', ParseIntPipe) roundId: number) {
    return this.surveyService.getIndicatorValues(roundId);
  }

  // PATCH /api/surveys/rounds/:roundId/indicator-values/:indicatorId
  @Patch('rounds/:roundId/indicator-values/:indicatorId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  reviewIndicatorValue(
    @Param('roundId', ParseIntPipe) roundId: number,
    @Param('indicatorId', ParseIntPipe) indicatorId: number,
    @Body() dto: ReviewIndicatorValueDto,
  ) {
    return this.surveyService.reviewIndicatorValue(roundId, indicatorId, dto);
  }

  // GET /api/surveys/comparison
  @Get('comparison')
  getComparison(@Query('indicatorIds') indicatorIds?: string) {
    const ids = indicatorIds
      ? indicatorIds.split(',').map(Number).filter(Boolean)
      : undefined;
    return this.surveyService.getComparison(ids);
  }
}
