import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root Information' })
  @ApiResponse({ status: 200, description: 'API information and quick links' })
  getRoot() {
    return {
      name: 'Universal E-Ticketing Platform API',
      version: '1.0.0',
      status: 'running',
      documentation: '/api/docs',
      health: '/health',
      endpoints: {
        events: '/api/v1/events',
        tickets: '/api/v1/tickets',
      },
    };
  }
}
