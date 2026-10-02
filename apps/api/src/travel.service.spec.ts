import { Test } from '@nestjs/testing';
import { TravelService } from './travel.service';

describe('TravelService', () => {
  let service: TravelService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [TravelService] }).compile();
    service = module.get(TravelService);
  });

  it('returns official holiday data without generated metrics', () => {
    const dashboard = service.getDashboard('SEOUL-JG', 3);
    expect(dashboard.area.areaCode).toBe('SEOUL-JG');
    expect(dashboard.inboundDemand).toEqual([]);
    expect(dashboard.marketRates).toEqual([]);
    expect(dashboard.summary).toBeNull();
    expect(dashboard.holidays.length).toBeGreaterThan(0);
  });

  it('does not synthesize market rates', () => {
    expect(service.getMarketRates('BUSAN-HU', 3)).toEqual({ history: [], roomTypes: [] });
  });

  it('returns every public holiday for selected countries', () => {
    const holidays = service.getHolidays('JP,CN,TW,US', [2026]);
    expect(holidays.length).toBeGreaterThan(50);
    expect(new Set(holidays.map((holiday) => holiday.countryCode))).toEqual(new Set(['JP', 'CN', 'TW', 'US']));
  });

  it('does not synthesize country booking-rate estimates', () => {
    expect(service.getCountryBookingRates('SEOUL-JG')).toEqual([]);
  });
});
