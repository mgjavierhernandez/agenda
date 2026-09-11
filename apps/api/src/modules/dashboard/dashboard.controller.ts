import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { TenantContextGuard, AuthenticatedRequest } from '../auth/tenant/tenant-context.guard';
import { DashboardService, DashboardData } from './dashboard.service';
import { GetDashboardQueryDto } from './dto/get-dashboard-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth('bearer')
@Controller('dashboard')
@UseGuards(AccessTokenGuard, TenantContextGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get role-based dashboard data for the current user' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  @ApiResponse({ status: 403, description: 'No active role for this institution' })
  async getDashboard(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetDashboardQueryDto,
  ): Promise<DashboardData> {
    return this.dashboardService.getDashboard(
      req.user.userId,
      req.tenant!.institutionId,
      query.periodId,
    );
  }
}
