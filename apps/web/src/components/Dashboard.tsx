'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoAreas, localDemo } from '@/lib/demo';
import type { DashboardData } from '@/lib/types';
import { HolidayCalendar } from './HolidayCalendar';
import { CountryBookingChart } from './CountryBookingChart';
import { PriceChart } from './PriceChart';
import { TrendChart } from './TrendChart';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
const money = (value: number) => `${new Intl.NumberFormat('ko-KR').format(value)}원`;
const shortDate = (date: string) => new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' }).format(new Date(`${date}T12:00:00`));

export function Dashboard() {
  const [areaCode, setAreaCode] = useState('SEOUL-JG');
  const [radius, setRadius] = useState(3);
  const [data, setData] = useState<DashboardData>(() => localDemo('SEOUL-JG'));
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetch(`${apiUrl}/dashboard/${areaCode}?radiusKm=${radius}&countryCodes=JP,CN,TW,US`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('API error'); return response.json(); })
      .then((payload: DashboardData) => { setData(payload); setDemo(false); })
      .catch((error: Error) => { if (error.name !== 'AbortError') { setData(localDemo(areaCode, radius)); setDemo(true); } })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [areaCode, radius]);

  const marketDirection = data.summary.marketChangePercent > 0 ? 'negative' : 'positive';
  const today = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const upcomingHolidays = useMemo(() => data.holidays.filter((holiday) => holiday.date >= today).slice(0, 6), [data.holidays, today]);
  const currentYearHolidayCount = useMemo(() => data.holidays.filter((holiday) => holiday.date.startsWith(String(currentYear))).length, [data.holidays, currentYear]);

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">↗</span><span>STAY SIGNAL</span></div>
        <div className="status"><span className="status-dot" /> {demo ? '로컬 폴백' : 'API 연결됨'} · 수요/시세 <b className="inline-fake">(fake)</b> · 공휴일 공식 데이터</div>
      </header>

      <section className="hero">
        <p className="eyebrow">LODGING REVENUE INTELLIGENCE</p>
        <h1>주변 시세와 방한 수요로<br /><em>가격 변화를 먼저 봅니다.</em></h1>
        <p className="hero-copy">개별 경쟁 숙소를 노출하지 않고, 운영 지역의 익명 집계 시세와 해외 연휴 신호를 제공합니다.</p>
      </section>

      <section className="controls panel">
        <label>운영 지역<select value={areaCode} onChange={(event) => setAreaCode(event.target.value)}>{demoAreas.map((item) => <option value={item.areaCode} key={item.areaCode}>{item.region} · {item.name}</option>)}</select></label>
        <label>시세 반경<select value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value={1}>1 km</option><option value={3}>3 km</option><option value={5}>5 km</option></select></label>
        <div className="control-destination"><span>KR</span><strong>{data.area.region} {data.area.name}</strong><small>운영 지역 기준</small></div>
        {loading && <span className="loading">업데이트 중…</span>}
      </section>

      <section className="metrics">
        <article><span>방한 수요 지수 <b className="inline-fake">(fake)</b></span><strong>{data.summary.demandIndex}</strong><small className="positive">▲ {Math.abs(data.summary.demandChangePercent)}% 전일 대비</small></article>
        <article><span>주변 시세 중앙값 <b className="inline-fake">(fake)</b></span><strong>{money(data.summary.marketMedian)}</strong><small className={marketDirection}>{data.summary.marketChangePercent > 0 ? '▲' : '▼'} {Math.abs(data.summary.marketChangePercent)}% 이전 수집 대비</small></article>
        <article><span>시장 가격 범위 <b className="inline-fake">(fake)</b></span><strong className="range-value">{money(data.summary.lowRate)}<i>–</i>{money(data.summary.highRate)}</strong><small>익명 표본 {data.summary.sampleSize}개 · 반경 {radius}km</small></article>
        <article><span>{currentYear}년 해외 공휴일</span><strong>{currentYearHolidayCount}<i>건</i></strong><small>일본 · 중국 · 대만 · 미국 전체</small></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel demand-panel">
          <div className="panel-title"><div><p>INBOUND SIGNAL</p><h2>방한 수요 흐름 <b className="fake-badge">(fake)</b></h2></div><span className="legend"><i /> 수요 지수</span></div>
          <TrendChart data={data.inboundDemand} />
        </article>
        <article className="panel holidays-panel">
          <div className="panel-title"><div><p>HOLIDAY WATCH</p><h2>주요국 다가오는 공휴일</h2></div></div>
          <div className="holiday-list">{upcomingHolidays.map((holiday) => <div key={`${holiday.countryCode}-${holiday.date}-${holiday.localName}`}><time>{shortDate(holiday.date)}</time><span><strong><b className="country-code">{holiday.countryCode}</b>{holiday.localName}</strong><small>{holiday.country} · {holiday.name}</small></span></div>)}</div>
        </article>
        <article className="panel market-panel">
          <div className="panel-title"><div><p>MARKET RATE</p><h2>14일 주변 시세 변동 <b className="fake-badge">(fake)</b></h2></div><small>개별 숙소 비노출 · 익명 집계</small></div>
          <PriceChart data={data.marketRates} />
        </article>
        <article className="panel insight-panel">
          <div className="panel-title"><div><p>RATE POSITION</p><h2>객실 유형별 중앙값 <b className="fake-badge">(fake)</b></h2></div></div>
          <div className="room-type-list">{data.roomTypes.map((room) => <div key={room.roomType}><span><strong>{room.roomType}</strong><small>표본 {room.sampleSize}개</small></span><strong>{money(room.currentMedian)}</strong><em className={room.changePercent > 0 ? 'negative' : 'positive'}>{room.changePercent > 0 ? '▲' : '▼'} {Math.abs(room.changePercent)}%</em></div>)}</div>
        </article>
      </section>

      <section className="panel country-demand-panel">
        <div className="panel-title">
          <div><p>COUNTRY BOOKING SIGNAL</p><h2>국가별 방한 항공 예매율</h2></div>
          <span className="estimate-badge">(fake) 추정치</span>
        </div>
        <div className="country-demand-content">
          <CountryBookingChart data={data.countryBookingRates ?? []} />
          <div className="country-rate-table">
            {(data.countryBookingRates ?? []).map((country) => <div key={country.countryCode}><span><b>{country.countryCode}</b><strong>{country.country}</strong></span><span><small>검색 비중</small>{country.searchSharePercent}%</span><span><small>전주 대비</small><em className={country.changePercent >= 0 ? 'positive' : 'negative'}>{country.changePercent >= 0 ? '▲' : '▼'} {Math.abs(country.changePercent)}%</em></span></div>)}
          </div>
        </div>
        <p className="estimate-note">항공사 실판매 데이터가 아닌 검색량·예약 신호·좌석 공급 기반 추정치입니다.</p>
      </section>

      <HolidayCalendar holidays={data.holidays} />

      <section className="panel action-panel">
        <div><p className="eyebrow">TODAY&apos;S SIGNAL</p><h2>가격 검토 신호 <b className="fake-badge">(fake)</b></h2></div>
        <p>주변 중앙값이 상승하고 방한 수요도 전일보다 높습니다. 주요 해외 공휴일 전후의 예약 속도를 확인해 판매가 조정을 검토하세요.</p>
        <span>추천 범위 <strong>{money(Math.round(data.summary.marketMedian * .96))} – {money(Math.round(data.summary.marketMedian * 1.08))}</strong></span>
      </section>

      <footer>STAY SIGNAL · 익명 집계 시세는 가격 결정을 위한 참고 지표이며 실제 판매가를 보장하지 않습니다.</footer>
    </main>
  );
}
