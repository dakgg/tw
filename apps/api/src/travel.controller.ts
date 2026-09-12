import { Controller, Get, Param, ParseFloatPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CollectionQueueService } from './collection-queue.service';
import { TravelService } from './travel.service';

@ApiTags('travel')
@Controller()
export class TravelController {
  constructor(private readonly travel: TravelService, private readonly queue: CollectionQueueService) {}

  @Get('operating-areas')
  getOperatingAreas() {
    return this.travel.getOperatingAreas();
  }

  @Get('dashboard/:areaCode')
  @ApiQuery({ name: 'radiusKm', required: false, example: 3 })
  getDashboard(@Param('areaCode') areaCode: string, @Query('radiusKm') radiusKm?: string, @Query('countryCodes') countryCodes?: string) {
    return this.travel.getDashboard(areaCode, radiusKm ? Number(radiusKm) : 3, countryCodes);
  }

  @Get('holidays')
  getHolidays(@Query('countryCodes') countryCodes = 'JP,CN,TW,US', @Query('year') year?: string) {
    return this.travel.getHolidays(countryCodes, [year ? Number(year) : new Date().getFullYear()]);
  }

  @Get('inbound-demand')
  getDemand(@Query('areaCode') areaCode = 'SEOUL-JG') {
    return this.travel.getInboundDemand(areaCode);
  }

  @Get('country-booking-rates')
  @ApiOperation({ summary: '출발 국가별 방한 항공 예매율 추정치' })
  getCountryBookingRates(@Query('areaCode') areaCode = 'SEOUL-JG') {
    return this.travel.getCountryBookingRates(areaCode);
  }

  @Get('market-rates')
  getMarketRates(
    @Query('areaCode') areaCode = 'SEOUL-JG',
    @Query('radiusKm', new ParseFloatPipe({ optional: true })) radiusKm = 3,
  ) {
    return this.travel.getMarketRates(areaCode, radiusKm);
  }

  @Post('collectors/run')
  @ApiOperation({ summary: '방한 수요·해외 공휴일·익명 시세 수집 작업을 큐에 등록' })
  enqueueCollection() {
    return this.queue.enqueueAll();
  }
}
