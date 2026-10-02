import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type ProviderResponse = {
  result?: string;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  rates?: Record<string, number>;
};

export type ExchangeRate = {
  countryCode: 'JP' | 'CN' | 'TW' | 'US';
  country: string;
  currencyCode: 'JPY' | 'CNY' | 'TWD' | 'USD';
  currencyName: string;
  unit: number;
  krwRate: number;
};

const currencies: Array<Omit<ExchangeRate, 'krwRate'>> = [
  { countryCode: 'JP', country: '일본', currencyCode: 'JPY', currencyName: '일본 엔', unit: 100 },
  { countryCode: 'CN', country: '중국', currencyCode: 'CNY', currencyName: '중국 위안', unit: 1 },
  { countryCode: 'TW', country: '대만', currencyCode: 'TWD', currencyName: '대만 달러', unit: 1 },
  { countryCode: 'US', country: '미국', currencyCode: 'USD', currencyName: '미국 달러', unit: 1 },
];

@Injectable()
export class ExchangeRateService {
  private cached?: { expiresAt: number; value: ReturnType<ExchangeRateService['formatRates']> };

  async getRates() {
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached.value;

    try {
      const response = await fetch('https://open.er-api.com/v6/latest/KRW', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as ProviderResponse;
      if (payload.result !== 'success' || !payload.rates || !payload.time_last_update_utc) throw new Error('Invalid provider response');

      const value = this.formatRates({ rates: payload.rates, time_last_update_utc: payload.time_last_update_utc });
      const providerExpiry = (payload.time_next_update_unix ?? 0) * 1000;
      this.cached = { expiresAt: Math.max(Date.now() + 60 * 60 * 1000, providerExpiry), value };
      return value;
    } catch {
      if (this.cached) return this.cached.value;
      throw new ServiceUnavailableException('환율 공급자에 연결할 수 없습니다.');
    }
  }

  private formatRates(payload: Required<Pick<ProviderResponse, 'rates' | 'time_last_update_utc'>>) {
    const rates = currencies.map((currency) => {
      const providerRate = payload.rates[currency.currencyCode];
      if (!Number.isFinite(providerRate) || providerRate <= 0) throw new Error(`Missing ${currency.currencyCode} rate`);
      return { ...currency, krwRate: Math.round((currency.unit / providerRate) * 100) / 100 };
    });

    return {
      baseCurrency: 'KRW' as const,
      updatedAt: new Date(payload.time_last_update_utc).toISOString(),
      source: { name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' },
      rates,
    };
  }
}
