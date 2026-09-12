import { Test } from '@nestjs/testing';
import { TravelService } from './travel.service';

describe('TravelService', () => {
  let service: TravelService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [TravelService] }).compile();
    service = module.get(TravelService);
  });

  it('builds a complete dashboard', () => {
    const dashboard = service.getDashboard('SEOUL-JG', 3);
    expect(dashboard.area.areaCode).toBe('SEOUL-JG');
    expect(dashboard.inboundDemand).toHaveLength(14);
    expect(dashboard.marketRates).toHaveLength(14);
    expect(dashboard.summary.marketMedian).toBeGreaterThan(0);
  });

  it('changes the market sample by radius', () => {
    const narrow = service.getMarketRates('BUSAN-HU', 1).history.at(-1)!;
    const wide = service.getMarketRates('BUSAN-HU', 5).history.at(-1)!;
    expect(wide.sampleSize).toBeGreaterThan(narrow.sampleSize);
  });

  it('returns every public holiday for selected countries', () => {
    const holidays = service.getHolidays('JP,CN,TW,US', [2026]);
    expect(holidays.length).toBeGreaterThan(50);
    expect(new Set(holidays.map((holiday) => holiday.countryCode))).toEqual(new Set(['JP', 'CN', 'TW', 'US']));
  });

  it('returns country booking-rate estimates', () => {
    const rates = service.getCountryBookingRates('SEOUL-JG');
    expect(rates).toHaveLength(4);
    expect(rates.every((rate) => rate.bookingRateEstimate >= 0 && rate.bookingRateEstimate <= 100)).toBe(true);
    expect(rates.every((rate) => rate.isFake)).toBe(true);
  });
});
