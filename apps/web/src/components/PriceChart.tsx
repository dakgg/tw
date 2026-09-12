'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { MarketRatePoint } from '@/lib/types';

export function PriceChart({ data }: { data: MarketRatePoint[] }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption({
      grid: { left: 58, right: 20, top: 36, bottom: 34 },
      tooltip: { trigger: 'axis', backgroundColor: '#18201d', borderWidth: 0, textStyle: { color: '#fff' } },
      legend: { top: 0, data: ['상단가', '중앙값', '하단가'], textStyle: { color: '#65736c' } },
      xAxis: { type: 'category', data: data.map((item) => item.date.slice(5)), axisLine: { lineStyle: { color: '#dfe5e1' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#edf0ee' } }, axisLabel: { formatter: (value: number) => `${Math.round(value / 10000)}만` } },
      series: [
        { name: '상단가', type: 'line', smooth: true, showSymbol: false, data: data.map((item) => item.high), lineStyle: { width: 1, color: '#d5a94f' } },
        { name: '중앙값', type: 'line', smooth: true, showSymbol: false, data: data.map((item) => item.median), lineStyle: { width: 3, color: '#18794e' } },
        { name: '하단가', type: 'line', smooth: true, showSymbol: false, data: data.map((item) => item.low), lineStyle: { width: 1, color: '#7c95c9' } },
      ],
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [data]);
  return <div className="chart" ref={element} aria-label="주변 시장 가격대 변동 차트" />;
}
