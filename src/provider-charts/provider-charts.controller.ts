import { Controller, UseInterceptors } from '@nestjs/common';
import { TransformResponseInterceptor } from 'src/interceptor/transform-response.interceptor';
import { ProviderChartsService } from 'src/services/provider-charts/provider-charts.service';

@Controller('provider-charts')
@UseInterceptors(new TransformResponseInterceptor())
export class ProviderChartsController {
  constructor(private providerChartsService: ProviderChartsService) {}
}
