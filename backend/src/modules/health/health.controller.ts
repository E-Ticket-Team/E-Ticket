import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check API and Database Health',
    description:
      'Performs connectivity check against PostgreSQL and returns system uptime, status, and latency.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System and database are healthy',
    type: HealthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Database or system component is unhealthy',
    type: HealthResponseDto,
  })
  async getHealth(): Promise<HealthResponseDto> {
    return this.healthService.check();
  }
}
