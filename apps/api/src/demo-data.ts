import { CountryBookingRate, DemandPoint, MarketRatePoint, OperatingArea, RoomTypeRate } from './types';

export const operatingAreas: OperatingArea[] = [
  { areaCode: 'SEOUL-JG', name: '중구', region: '서울', coordinates: [126.9976, 37.5636], currency: 'KRW' },
  { areaCode: 'BUSAN-HU', name: '해운대구', region: '부산', coordinates: [129.1635, 35.1631], currency: 'KRW' },
  { areaCode: 'JEJU-JJ', name: '제주시', region: '제주', coordinates: [126.5312, 33.4996], currency: 'KRW' },
];

const iso = (offset: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export function demandFor(areaCode: string): DemandPoint[] {
  const base = areaCode === 'JEJU-JJ' ? 63 : areaCode === 'BUSAN-HU' ? 68 : 74;
  return Array.from({ length: 14 }, (_, index) => ({
    date: iso(index),
    demandIndex: Math.round((base + Math.sin(index / 2) * 11 + index * 0.7) * 10) / 10,
    inboundSearchVolume: Math.round(960 + base * 9 + index * 31 + Math.sin(index / 2) * 130),
    isFake: true,
  }));
}

export function countryBookingRatesFor(areaCode: string): CountryBookingRate[] {
  const areaWeight = areaCode === 'JEJU-JJ' ? -4 : areaCode === 'BUSAN-HU' ? 2 : 5;
  return [
    { countryCode: 'JP', country: '일본', rate: 71, change: 6.8, share: 31, seats: 42800, confidence: 'high' as const },
    { countryCode: 'CN', country: '중국', rate: 64, change: 4.1, share: 27, seats: 39600, confidence: 'medium' as const },
    { countryCode: 'TW', country: '대만', rate: 76, change: 9.3, share: 18, seats: 21400, confidence: 'high' as const },
    { countryCode: 'US', country: '미국', rate: 58, change: -1.7, share: 11, seats: 12600, confidence: 'medium' as const },
  ].map((item) => ({
    countryCode: item.countryCode,
    country: item.country,
    bookingRateEstimate: Math.max(0, Math.min(100, item.rate + areaWeight)),
    changePercent: item.change,
    searchSharePercent: item.share,
    seatCapacity: item.seats,
    confidence: item.confidence,
    isFake: true,
  }));
}

export function marketRatesFor(areaCode: string, radiusKm: number): MarketRatePoint[] {
  const base = areaCode === 'JEJU-JJ' ? 138000 : areaCode === 'BUSAN-HU' ? 152000 : 168000;
  const radiusWeight = radiusKm === 1 ? 1.04 : radiusKm === 5 ? 0.96 : 1;
  return Array.from({ length: 14 }, (_, index) => {
    const median = Math.round(base * radiusWeight * (0.92 + index * 0.012 + Math.sin(index / 2) * 0.035));
    return {
      date: iso(index - 7), low: Math.round(median * 0.72), median,
      average: Math.round(median * 1.06), high: Math.round(median * 1.42),
      sampleSize: Math.round(34 + radiusKm * 13 + Math.sin(index) * 4), isFake: true,
    };
  });
}

export function roomTypesFor(areaCode: string, radiusKm: number): RoomTypeRate[] {
  const latest = marketRatesFor(areaCode, radiusKm).at(-1)?.median ?? 0;
  return [
    { roomType: '스탠다드', factor: 0.78, change: 5.2, samples: 31 },
    { roomType: '디럭스', factor: 1, change: 8.4, samples: 26 },
    { roomType: '패밀리', factor: 1.34, change: -2.1, samples: 17 },
    { roomType: '스위트', factor: 1.82, change: 3.7, samples: 9 },
  ].map((item) => {
    const currentMedian = Math.round(latest * item.factor);
    return { roomType: item.roomType, currentMedian, previousMedian: Math.round(currentMedian / (1 + item.change / 100)), changePercent: item.change, sampleSize: item.samples + radiusKm * 3, isFake: true };
  });
}
