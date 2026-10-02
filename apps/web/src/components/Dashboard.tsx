'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ExchangeRateData, Holiday } from '@/lib/types';
import { HolidayCalendar } from './HolidayCalendar';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
const countryCodes = 'JP,CN,TW,US';
const shortDate = (date: string) => new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));
const won = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Dashboard() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const holidayRequest = Promise.all([currentYear, currentYear + 1].map(async (year) => {
      const response = await fetch(`${apiUrl}/holidays?countryCodes=${countryCodes}&year=${year}`, { signal: controller.signal });
      if (!response.ok) throw new Error('공휴일 데이터를 불러오지 못했습니다.');
      return response.json() as Promise<Holiday[]>;
    }));
    const exchangeRateRequest = fetch(`${apiUrl}/exchange-rates`, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error('환율 데이터를 불러오지 못했습니다.');
      return response.json() as Promise<ExchangeRateData>;
    });
    Promise.all([holidayRequest, exchangeRateRequest])
      .then(([holidayResults, rateData]) => {
        setHolidays(holidayResults.flat());
        setExchangeRates(rateData);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [currentYear]);

  const today = new Date().toISOString().slice(0, 10);
  const upcomingHolidays = useMemo(() => holidays.filter((holiday) => holiday.date >= today).slice(0, 8), [holidays, today]);
  const currentYearHolidayCount = useMemo(() => holidays.filter((holiday) => holiday.date.startsWith(String(currentYear))).length, [holidays, currentYear]);

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">↗</span><span>STAY SIGNAL</span></div>
        <div className="status"><span className="status-dot" /> {error ? 'API 연결 오류' : loading ? '데이터 불러오는 중' : '공휴일 데이터 연결됨'}</div>
      </header>

      <section className="hero">
        <p className="eyebrow">HOLIDAY INTELLIGENCE</p>
        <h1>해외 공휴일 신호로<br /><em>숙박 수요 시점을 살펴봅니다.</em></h1>
        <p className="hero-copy">일본·중국·대만·미국의 공휴일 일정을 한곳에서 확인하세요.</p>
      </section>

      {error ? <section className="panel data-notice"><strong>데이터를 표시할 수 없습니다.</strong><span>{error}</span></section> : (
        <>
          <section className="metrics holiday-metrics">
            <article><span>{currentYear}년 해외 공휴일</span><strong>{loading ? '—' : currentYearHolidayCount}<i>건</i></strong><small>일본 · 중국 · 대만 · 미국 전체</small></article>
            <article><span>데이터 범위</span><strong>{currentYear}<i>–</i>{currentYear + 1}</strong><small>공휴일 데이터셋 기준</small></article>
          </section>

          <section className="panel upcoming-panel">
            <div className="panel-title"><div><p>HOLIDAY WATCH</p><h2>다가오는 주요 공휴일</h2></div></div>
            <div className="holiday-list">
              {upcomingHolidays.map((holiday) => <div key={`${holiday.countryCode}-${holiday.date}-${holiday.localName}`}><time>{shortDate(holiday.date)}</time><span><strong><b className="country-code">{holiday.countryCode}</b>{holiday.localName}</strong><small>{holiday.country} · {holiday.name}</small></span></div>)}
              {!loading && upcomingHolidays.length === 0 && <p className="empty">표시할 예정 공휴일이 없습니다.</p>}
            </div>
          </section>

          {exchangeRates && (
            <section className="panel exchange-panel">
              <div className="panel-title">
                <div><p>EXCHANGE RATES</p><h2>나라별 원화 환율</h2></div>
                <small>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(exchangeRates.updatedAt))} 기준</small>
              </div>
              <div className="exchange-grid">
                {exchangeRates.rates.map((rate) => (
                  <article key={rate.currencyCode}>
                    <span><b>{rate.countryCode}</b>{rate.country}</span>
                    <small>{rate.currencyName} · {rate.unit} {rate.currencyCode}</small>
                    <strong>{won.format(rate.krwRate)}<i>원</i></strong>
                  </article>
                ))}
              </div>
              <p className="source-note">데이터 출처: <a href={exchangeRates.source.url} target="_blank" rel="noreferrer">Rates By {exchangeRates.source.name}</a> · 일 1회 갱신되는 참고 환율</p>
            </section>
          )}

          <HolidayCalendar holidays={holidays} />
        </>
      )}

      <section className="panel data-notice">
        <strong>수요·예매율·숙박 시세 데이터는 표시하지 않습니다.</strong>
        <span>승인된 실제 데이터 공급자가 연결되기 전까지 생성값이나 대체값을 사용하지 않습니다.</span>
      </section>

      <footer>STAY SIGNAL · 공휴일 일정은 운영 판단을 위한 참고 정보입니다.</footer>
    </main>
  );
}
