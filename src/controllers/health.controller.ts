import { Controller, Get } from '@nestjs/common';
import { Public } from '../middleware/decorators';

@Controller('api/v1/G/health')
export class HealthController {
  @Get()
  @Public()
  check() {
    return {
      status: 'ok',
      service: 'sample-customer-service',
      timestamp: new Date().toISOString(),
    };
  }
}
