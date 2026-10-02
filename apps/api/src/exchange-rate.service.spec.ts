import { ExchangeRateService } from './exchange-rate.service';

describe('ExchangeRateService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns KRW rates with country units and source attribution', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        result: 'success',
        time_last_update_utc: 'Fri, 02 Oct 2026 00:00:00 +0000',
        time_next_update_unix: 1790902800,
        rates: { JPY: 0.116, CNY: 0.00496, TWD: 0.02352, USD: 0.000735 },
      }),
    } as Response);

    const result = await new ExchangeRateService().getRates();

    expect(result.source).toEqual({ name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' });
    expect(result.rates.map((rate) => rate.currencyCode)).toEqual(['JPY', 'CNY', 'TWD', 'USD']);
    expect(result.rates[0]).toMatchObject({ unit: 100, krwRate: 862.07 });
    expect(result.rates[3]).toMatchObject({ unit: 1, krwRate: 1360.54 });
  });
});
