import { Injectable, NotFoundException } from '@nestjs/common';
import { publicHolidays } from './holiday-data';
import { operatingAreas } from './operating-areas';
import type { CountryBookingRate, DemandPoint, MarketRatePoint, RoomTypeRate } from './types';

@Injectable()
export class TravelService {
  getOperatingAreas() { return operatingAreas; }

  getHolidays(countryCodes = 'JP,CN,TW,US', years = [new Date().getFullYear()]) {
    return publicHolidays(countryCodes, years);
  }

  getInboundDemand(areaCode: string): DemandPoint[] {
    this.assertArea(areaCode);
    return [];
  }

  getCountryBookingRates(areaCode: string): CountryBookingRate[] {
    this.assertArea(areaCode);
    return [];
  }

  getMarketRates(areaCode: string, radiusKm = 3): { history: MarketRatePoint[]; roomTypes: RoomTypeRate[] } {
    this.assertArea(areaCode);
    void radiusKm;
    return { history: [], roomTypes: [] };
  }

  getDashboard(areaCode: string, radiusKm = 3, countryCodes?: string) {
    const area = this.assertArea(areaCode);
    return {
      area, generatedAt: new Date().toISOString(), dataMode: 'unavailable', filters: { radiusKm, countryCodes: countryCodes ?? 'JP,CN,TW,US' },
      summary: null,
      inboundDemand: [],
      countryBookingRates: [],
      holidays: this.getHolidays(countryCodes, [new Date().getFullYear(), new Date().getFullYear() + 1]),
      marketRates: [],
      roomTypes: [],
    };
  }

  private assertArea(areaCode: string) {
    const area = operatingAreas.find((item) => item.areaCode === areaCode.toUpperCase());
    if (!area) throw new NotFoundException(`지원하지 않는 운영 지역 코드입니다: ${areaCode}`);
    return area;
  }
}
