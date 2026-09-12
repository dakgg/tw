import type Holidays from 'date-holidays';
import type { Holiday } from './types';

const HolidaysConstructor = require('date-holidays') as typeof Holidays;

const COUNTRY_NAMES: Record<string, string> = {
  JP: '일본',
  CN: '중국',
  TW: '대만',
  US: '미국',
};

export function publicHolidays(countryCodes: string, years: number[]): Holiday[] {
  const selectedCountries = [...new Set(countryCodes.toUpperCase().split(',').map((code) => code.trim()).filter((code) => COUNTRY_NAMES[code]))];
  const selectedYears = [...new Set(years)];

  return selectedCountries
    .flatMap((countryCode) => {
      const calendar = new HolidaysConstructor(countryCode);
      return selectedYears.flatMap((year) =>
        calendar.getHolidays(year)
          .filter((holiday) => holiday.type === 'public')
          .map((holiday) => ({
            countryCode,
            country: COUNTRY_NAMES[countryCode],
            date: holiday.date.slice(0, 10),
            name: holiday.name,
            localName: holiday.name,
          })),
      );
    })
    .sort((left, right) => left.date.localeCompare(right.date) || left.countryCode.localeCompare(right.countryCode));
}
