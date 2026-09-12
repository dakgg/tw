'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { CountryBookingRate } from '@/lib/types';

export function CountryBookingChart({ data }: { data: CountryBookingRate[] }) {
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption({
      grid: { left: 78, right: 38, top: 20, bottom: 28 },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#18201d', borderWidth: 0, textStyle: { color: '#fff' },
        formatter: (params: Array<{ dataIndex: number }>) => {
          const item = data[params[0].dataIndex];
          return `<b>${item.country} (fake)</b><br/>예매율 추정 ${item.bookingRateEstimate}%<br/>검색 비중 ${item.searchSharePercent}%<br/>좌석 공급 ${item.seatCapacity.toLocaleString()}석`;
        },
      },
      xAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#718078' }, splitLine: { lineStyle: { color: '#edf0ee' } } },
      yAxis: { type: 'category', inverse: true, data: data.map((item) => `${item.countryCode}  ${item.country}`), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#34433c', fontWeight: 700 } },
      series: [{ type: 'bar', data: data.map((item) => item.bookingRateEstimate), barWidth: 22, showBackground: true, backgroundStyle: { color: '#edf1ee', borderRadius: 7 }, itemStyle: { color: '#18794e', borderRadius: [0, 7, 7, 0] }, label: { show: true, position: 'right', formatter: '{c}%', color: '#17211d', fontWeight: 800 } }],
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [data]);

  return <div className="country-booking-chart" ref={element} aria-label="국가별 항공 예매율 추정 차트" />;
}
