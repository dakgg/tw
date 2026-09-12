export type OperatingArea = {
  areaCode: string;
  name: string;
  region: string;
  coordinates: [number, number];
  currency: 'KRW';
};

export type Holiday = {
  countryCode: string;
  country: string;
  date: string;
  name: string;
  localName: string;
};

export type DemandPoint = {
  date: string;
  demandIndex: number;
  inboundSearchVolume: number;
  isFake: true;
};

export type CountryBookingRate = {
  countryCode: string;
  country: string;
  bookingRateEstimate: number;
  changePercent: number;
  searchSharePercent: number;
  seatCapacity: number;
  confidence: 'high' | 'medium' | 'low';
  isFake: true;
};

export type MarketRatePoint = {
  date: string;
  low: number;
  median: number;
  average: number;
  high: number;
  sampleSize: number;
  isFake: true;
};

export type RoomTypeRate = {
  roomType: string;
  currentMedian: number;
  previousMedian: number;
  changePercent: number;
  sampleSize: number;
  isFake: true;
};
