'use client';
import { useState } from 'react';
import type { Channel } from '@/lib/types';
import { channelNames, csvCell, download, guestName, money, nights, roomName } from '@/lib/console';
import { ChannelBadge, Empty, Icon, Panel, Stat } from './Ui';
import { useWorkspace } from './Workspace';

export function Reports() {
  const { data, reservations, mutate, busy } = useWorkspace();
  const [month, setMonth] = useState(data.today.slice(0, 7));
  const items = reservations.filter((item) => item.status !== 'cancelled' && item.checkOut.startsWith(month)).sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  const gross = items.reduce((sum, item) => sum + item.total, 0);
  const commission = items.reduce((sum, item) => sum + item.commission, 0);
  const settled = items.filter((item) => item.settled).reduce((sum, item) => sum + item.total - item.commission, 0);
  const totalNights = items.reduce((sum, item) => sum + nights(item), 0);
  const distribution = Object.entries(channelNames).map(([id, name]) => ({ id: id as Channel, name, count: items.filter((item) => item.channel === id).length, total: items.filter((item) => item.channel === id).reduce((sum, item) => sum + item.total, 0) }));
  const monthDays = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daily = Array.from({ length: monthDays }, (_, index) => ({ day: index + 1, total: items.filter((item) => Number(item.checkOut.slice(8)) === index + 1).reduce((sum, item) => sum + item.total, 0) }));
  const maximum = Math.max(...daily.map((item) => item.total), 1);
  function exportCsv() {
    const rows: (string | number)[][] = [['예약 번호', '게스트', '객실', '채널', '체크인', '체크아웃', '예약 총액', '수수료', '정산 예정액', '정산 상태'], ...items.map((item) => [item.id, guestName(data, item.guestId), roomName(data, item.roomId), channelNames[item.channel], item.checkIn, item.checkOut, item.total, item.commission, item.total - item.commission, item.settled ? '완료' : '대기'])];
    download(`eh-report-${month}.csv`, '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  return <>
    <div className="section-toolbar"><label className="filter-inline">정산 기준 월 <input aria-label="리포트 월" type="month" min="2000-01" max="2100-12" value={month} onChange={(event) => event.target.value && setMonth(event.target.value)} /></label><button className="button" onClick={exportCsv}><Icon name="download" size={17} />CSV 내려받기</button></div>
    <div className="stats-grid"><Stat label="예약 매출" value={money(gross)} unit="원" hint={`${items.length}건 · 취소 예약 제외`} icon="chart" /><Stat label="채널 수수료" value={money(commission)} unit="원" hint="예약별 입력한 수수료 합계" icon="link" /><Stat label="정산 완료" value={money(settled)} unit="원" hint={`미정산 ${money(gross - commission - settled)}원`} icon="check" /><Stat label="평균 객단가" value={money(totalNights ? Math.round(gross / totalNights) : 0)} unit="원" hint={`예약 총액 ÷ ${totalNights}박`} icon="home" /></div>
    <div className="report-grid"><Panel title="일별 예약 매출" description="예약의 체크아웃 날짜에 총액을 집계합니다."><div className="sales-chart" role="img" aria-label={`${month} 일별 매출. 최고 ${money(maximum === 1 ? 0 : maximum)}원. 상세 내역은 아래 표를 확인하세요.`}>{daily.map((item) => <div key={item.day} title={`${month}-${item.day}: ${money(item.total)}원`}><span className={item.total ? 'has-sales' : ''} style={{ height: `${Math.max(2, item.total / maximum * 100)}%` }} /><small>{item.day % 5 === 0 || item.day === 1 ? item.day : ''}</small></div>)}</div><div className="chart-axis"><span>₩0</span><span>최고 ₩{money(maximum === 1 ? 0 : maximum)}</span></div></Panel><Panel title="채널별 매출" description="채널별 비중과 예약 건수"><div className="distribution">{distribution.map((item) => <div key={item.id}><div><ChannelBadge channel={item.id} /><strong>₩{money(item.total)}</strong></div><div className="progress-track"><span className={item.id} style={{ width: `${gross ? item.total / gross * 100 : 0}%` }} /></div><small>{item.count}건 · {gross ? Math.round(item.total / gross * 100) : 0}%</small></div>)}</div></Panel></div>
    <Panel title="정산 내역" description="실제 입금 내역을 확인한 뒤 정산 완료로 표시하세요."><div className="table-scroll"><table><thead><tr><th>게스트 · 예약</th><th>체크아웃</th><th>채널</th><th>예약 금액</th><th>수수료</th><th>정산 예정액</th><th>정산 상태</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{guestName(data, item.guestId)}</strong><small>{item.id}</small></td><td>{item.checkOut}</td><td><ChannelBadge channel={item.channel} /></td><td className="numeric">₩{money(item.total)}</td><td className="numeric muted">₩{money(item.commission)}</td><td className="numeric"><strong>₩{money(item.total - item.commission)}</strong></td><td><button className={`settlement-button ${item.settled ? 'settled' : ''}`} disabled={busy} onClick={() => void mutate(`/reservations/${item.id}/settlement`, { settled: !item.settled }, 'PATCH', '정산 상태를 저장했습니다.').catch(() => {})}>{item.settled ? '✓ 정산 완료' : '정산 대기'}</button></td></tr>)}</tbody></table></div>{items.length === 0 && <Empty title="해당 월의 예약 내역이 없습니다." description="체크아웃 날짜가 선택한 월에 포함되는 예약을 집계합니다." />}</Panel>
    <p className="help-text">체크아웃 월 기준 예약 금액 집계입니다. 취소 예약은 제외하며 세금·운영비·환불·실제 채널 입금 내역은 포함하지 않습니다.</p>
  </>;
}
