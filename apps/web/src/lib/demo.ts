import type { DashboardData, OperatingArea } from './types';

export const demoAreas: OperatingArea[] = [
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

export function localDemo(areaCode: string, radiusKm = 3): DashboardData {
  const area = demoAreas.find((item) => item.areaCode === areaCode) ?? demoAreas[0];
  const base = areaCode === 'JEJU-JJ' ? 138000 : areaCode === 'BUSAN-HU' ? 152000 : 168000;
  const marketRates = Array.from({ length: 14 }, (_, index) => {
    const median = Math.round(base * (0.92 + index * 0.012 + Math.sin(index / 2) * 0.035));
    return { date: iso(index - 7), low: Math.round(median * 0.72), median, average: Math.round(median * 1.06), high: Math.round(median * 1.42), sampleSize: 34 + radiusKm * 13, isFake: true };
  });
  const inboundDemand = Array.from({ length: 14 }, (_, index) => ({ date: iso(index), demandIndex: Math.round((69 + index * 0.8 + Math.sin(index / 2) * 11) * 10) / 10, inboundSearchVolume: 1200 + index * 38, isFake: true }));
  const latest = marketRates.at(-1)!;
  const previous = marketRates.at(-2)!;
  const roomTypes = [
    ['스탠다드', .78, 5.2, 31], ['디럭스', 1, 8.4, 26], ['패밀리', 1.34, -2.1, 17], ['스위트', 1.82, 3.7, 9],
  ].map(([roomType, factor, changePercent, samples]) => {
    const currentMedian = Math.round(latest.median * Number(factor));
    return { roomType: String(roomType), currentMedian, previousMedian: Math.round(currentMedian / (1 + Number(changePercent) / 100)), changePercent: Number(changePercent), sampleSize: Number(samples) + radiusKm * 3, isFake: true };
  });
  return {
    area, generatedAt: new Date().toISOString(), dataMode: 'fake', filters: { radiusKm, countryCodes: 'JP,CN,TW,US' },
    summary: { demandIndex: inboundDemand.at(-1)!.demandIndex, demandChangePercent: 2.8, marketMedian: latest.median, marketChangePercent: Math.round(((latest.median - previous.median) / previous.median) * 1000) / 10, lowRate: latest.low, highRate: latest.high, sampleSize: latest.sampleSize },
    inboundDemand,
    countryBookingRates: [
      { countryCode: 'JP', country: '일본', bookingRateEstimate: 76, changePercent: 6.8, searchSharePercent: 31, seatCapacity: 42800, confidence: 'high', isFake: true },
      { countryCode: 'CN', country: '중국', bookingRateEstimate: 69, changePercent: 4.1, searchSharePercent: 27, seatCapacity: 39600, confidence: 'medium', isFake: true },
      { countryCode: 'TW', country: '대만', bookingRateEstimate: 81, changePercent: 9.3, searchSharePercent: 18, seatCapacity: 21400, confidence: 'high', isFake: true },
      { countryCode: 'US', country: '미국', bookingRateEstimate: 63, changePercent: -1.7, searchSharePercent: 11, seatCapacity: 12600, confidence: 'medium', isFake: true },
    ],
    holidays: [
      { countryCode: 'JP', country: '일본', date: iso(7), name: 'Respect for the Aged Day', localName: '敬老の日' },
      { countryCode: 'CN', country: '중국', date: iso(12), name: 'Mid-Autumn Festival', localName: '中秋节' },
      { countryCode: 'TW', country: '대만', date: iso(16), name: 'National Day', localName: '國慶日' },
    ],
    marketRates, roomTypes,
  };
}
