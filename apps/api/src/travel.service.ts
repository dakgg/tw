import { Injectable, NotFoundException } from '@nestjs/common';
import { countryBookingRatesFor, demandFor, marketRatesFor, operatingAreas, roomTypesFor } from './demo-data';
import { publicHolidays } from './holiday-data';

@Injectable()
export class TravelService {
  getOperatingAreas() { return operatingAreas; }

  getHolidays(countryCodes = 'JP,CN,TW,US', years = [new Date().getFullYear()]) {
    return publicHolidays(countryCodes, years);
  }

  getInboundDemand(areaCode: string) {
    this.assertArea(areaCode);
    return demandFor(areaCode.toUpperCase());
  }

  getCountryBookingRates(areaCode: string) {
    this.assertArea(areaCode);
    return countryBookingRatesFor(areaCode.toUpperCase());
  }

  getMarketRates(areaCode: string, radiusKm = 3) {
    this.assertArea(areaCode);
    return { history: marketRatesFor(areaCode.toUpperCase(), radiusKm), roomTypes: roomTypesFor(areaCode.toUpperCase(), radiusKm) };
  }

  getDashboard(areaCode: string, radiusKm = 3, countryCodes?: string) {
    const area = this.assertArea(areaCode);
    const inboundDemand = demandFor(area.areaCode);
    const marketRates = marketRatesFor(area.areaCode, radiusKm);
    const latestRate = marketRates.at(-1)!;
    const previousRate = marketRates.at(-2)!;
    const currentDemand = inboundDemand.at(-1)?.demandIndex ?? 0;
    const previousDemand = inboundDemand.at(-2)?.demandIndex ?? currentDemand;
    return {
      area, generatedAt: new Date().toISOString(), dataMode: 'fake', filters: { radiusKm, countryCodes: countryCodes ?? 'JP,CN,TW,US' },
      summary: {
        demandIndex: currentDemand,
        demandChangePercent: Math.round(((currentDemand - previousDemand) / previousDemand) * 1000) / 10,
        marketMedian: latestRate.median,
        marketChangePercent: Math.round(((latestRate.median - previousRate.median) / previousRate.median) * 1000) / 10,
        lowRate: latestRate.low, highRate: latestRate.high, sampleSize: latestRate.sampleSize,
      },
      inboundDemand,
      countryBookingRates: countryBookingRatesFor(area.areaCode),
      holidays: this.getHolidays(countryCodes, [new Date().getFullYear(), new Date().getFullYear() + 1]),
      marketRates,
      roomTypes: roomTypesFor(area.areaCode, radiusKm),
    };
  }

  private assertArea(areaCode: string) {
    const area = operatingAreas.find((item) => item.areaCode === areaCode.toUpperCase());
    if (!area) throw new NotFoundException(`지원하지 않는 운영 지역 코드입니다: ${areaCode}`);
    return area;
  }
}
