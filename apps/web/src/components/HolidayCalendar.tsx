'use client';

import { useMemo, useState } from 'react';
import type { Holiday } from '@/lib/types';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const countryClass: Record<string, string> = { JP: 'jp', CN: 'cn', TW: 'tw', US: 'us' };

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function HolidayCalendar({ holidays }: { holidays: Holiday[] }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const relativeDay = index - firstWeekday + 1;
      if (relativeDay < 1) {
        const day = previousMonthDays + relativeDay;
        const date = new Date(year, month - 1, day);
        return { day, muted: true, key: dateKey(date.getFullYear(), date.getMonth(), day) };
      }
      if (relativeDay > daysInMonth) {
        const day = relativeDay - daysInMonth;
        const date = new Date(year, month + 1, day);
        return { day, muted: true, key: dateKey(date.getFullYear(), date.getMonth(), day) };
      }
      return { day: relativeDay, muted: false, key: dateKey(year, month, relativeDay) };
    });
  }, [visibleMonth]);

  const holidaysByDate = useMemo(() => {
    return holidays.reduce<Record<string, Holiday[]>>((result, holiday) => {
      (result[holiday.date] ??= []).push(holiday);
      return result;
    }, {});
  }, [holidays]);

  const moveMonth = (offset: number) => setVisibleMonth((date) => new Date(date.getFullYear(), date.getMonth() + offset, 1));
  const title = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long' }).format(visibleMonth);

  return (
    <section className="panel calendar-panel">
      <div className="panel-title calendar-header">
        <div><p>HOLIDAY CALENDAR</p><h2>해외 공휴일 달력</h2></div>
        <div className="calendar-navigation">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">‹</button>
          <strong>{title}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">›</button>
        </div>
      </div>
      <div className="calendar-legend">
        {Object.entries({ JP: '일본', CN: '중국', TW: '대만', US: '미국' }).map(([code, country]) => <span key={code}><i className={countryClass[code]} />{country}</span>)}
      </div>
      <div className="calendar-grid" role="grid" aria-label={title}>
        {weekdays.map((weekday, index) => <div className={`calendar-weekday day-${index}`} role="columnheader" key={weekday}>{weekday}</div>)}
        {cells.map((cell, index) => {
          const dayHolidays = holidaysByDate[cell.key] ?? [];
          return (
            <div className={`calendar-day ${cell.muted ? 'muted' : ''} ${(index % 7 === 0 || index % 7 === 6) ? 'weekend' : ''} ${dayHolidays.length ? 'has-holiday' : ''}`} role="gridcell" key={`${cell.key}-${index}`}>
              <time dateTime={cell.key}>{cell.day}</time>
              <div>{dayHolidays.map((holiday) => <span className={`calendar-event ${countryClass[holiday.countryCode] ?? ''}`} title={`${holiday.country} · ${holiday.name}`} key={`${holiday.countryCode}-${holiday.localName}`}><b>{holiday.countryCode}</b>{holiday.localName}</span>)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
