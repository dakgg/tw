'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';
import type { DemandPoint } from '@/lib/types';

export function TrendChart({ data }: { data: DemandPoint[] }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption({
      grid: { left: 42, right: 26, top: 34, bottom: 34 },
      tooltip: { trigger: 'axis', backgroundColor: '#18201d', borderWidth: 0, textStyle: { color: '#fff' } },
      xAxis: { type: 'category', data: data.map((item) => item.date.slice(5)), axisLine: { lineStyle: { color: '#dfe5e1' } }, axisLabel: { color: '#718078' } },
      yAxis: { type: 'value', min: 40, max: 100, splitLine: { lineStyle: { color: '#edf0ee' } }, axisLabel: { color: '#718078' } },
      series: [{ type: 'line', smooth: true, data: data.map((item) => item.demandIndex), showSymbol: false, lineStyle: { width: 3, color: '#18794e' }, areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(24,121,78,.28)' }, { offset: 1, color: 'rgba(24,121,78,0)' }]) } }],
    });
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [data]);
  return <div className="chart" ref={element} aria-label="항공 수요 지수 추이 차트" />;
}
