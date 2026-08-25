import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  uptime: number;
}

export interface ReadinessResponse {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'connected' | 'error';
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @ApiOperation({ summary: 'Readiness probe (includes DB check)' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service unavailable (DB down)' })
  @Get('readiness')
  async getReadiness(): Promise<ReadinessResponse> {
    let database: 'connected' | 'error' = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    return {
      status: database === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
