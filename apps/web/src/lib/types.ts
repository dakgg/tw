export type OperatingArea = { areaCode: string; name: string; region: string; coordinates: [number, number]; currency: 'KRW' };
export type Holiday = { countryCode: string; country: string; date: string; name: string; localName: string };
export type DemandPoint = { date: string; demandIndex: number; inboundSearchVolume: number; isFake: boolean };
export type CountryBookingRate = { countryCode: string; country: string; bookingRateEstimate: number; changePercent: number; searchSharePercent: number; seatCapacity: number; confidence: 'high' | 'medium' | 'low'; isFake: boolean };
export type MarketRatePoint = { date: string; low: number; median: number; average: number; high: number; sampleSize: number; isFake: boolean };
export type RoomTypeRate = { roomType: string; currentMedian: number; previousMedian: number; changePercent: number; sampleSize: number; isFake: boolean };
export type DashboardData = {
  area: OperatingArea;
  generatedAt: string;
  dataMode: 'fake' | 'live';
  filters: { radiusKm: number; countryCodes: string };
  summary: { demandIndex: number; demandChangePercent: number; marketMedian: number; marketChangePercent: number; lowRate: number; highRate: number; sampleSize: number };
  inboundDemand: DemandPoint[];
  countryBookingRates: CountryBookingRate[];
  holidays: Holiday[];
  marketRates: MarketRatePoint[];
  roomTypes: RoomTypeRate[];
};
