'use client';
import { useState } from 'react';
import { addDays, dayLabel, guestName, money } from '@/lib/console';
import { Empty, Field, Icon, Modal, Panel } from './Ui';
import { formNumber, formText, useWorkspace } from './Workspace';

export function Rates() {
  const { data, rooms, reservations, mutate, navigate } = useWorkspace();
  const [start, setStart] = useState(data.today);
  const [editing, setEditing] = useState<{ roomId: string; date: string } | null>(null);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const room = rooms.find((item) => item.id === editing?.roomId);
  const rate = data.rates.find((item) => item.roomId === editing?.roomId && item.date === editing?.date);
  return <>
    <div className="info-banner"><Icon name="link" /><span><strong>콘솔 요금·재고 관리</strong> OTA 미연결 상태입니다. 저장한 요금과 판매 상태는 외부 채널에 전송되지 않습니다.</span><button className="text-button" onClick={() => navigate('channels')}>채널 설정 →</button></div>
    <Panel title="객실별 판매 캘린더" description="날짜를 선택해 요금과 판매 상태를 변경하세요." action={<button className="button primary" disabled={!rooms.length} onClick={() => setEditing({ roomId: rooms[0].id, date: start })}><Icon name="plus" size={16} />기간별 일괄 수정</button>}>
      <div className="calendar-toolbar"><button className="button" onClick={() => setStart(addDays(start, -7))}>← 이전 주</button><label>시작일 <input type="date" value={start} min="2000-01-01" max="2100-12-24" onChange={(event) => event.target.value && setStart(event.target.value)} /></label><button className="button" onClick={() => setStart(addDays(start, 7))}>다음 주 →</button></div>
      <div className="table-scroll"><table className="calendar-table rate-table"><thead><tr><th>객실 / 기본 요금</th>{dates.map((date) => <th key={date} className={date === data.today ? 'today' : ''}>{dayLabel(date)}<small>{date === data.today ? '오늘' : date.slice(0, 4)}</small></th>)}</tr></thead><tbody>{rooms.map((item) => <tr key={item.id}><th>{item.name}<small>{item.type}</small><small>₩{money(item.baseRate)}</small></th>{dates.map((date) => {
        const daily = data.rates.find((value) => value.roomId === item.id && value.date === date);
        const booking = reservations.find((value) => value.roomId === item.id && value.status !== 'cancelled' && value.checkIn <= date && value.checkOut > date);
        return <td key={date}><button className={`rate-cell ${booking ? 'booked' : daily?.closed ? 'closed' : ''}`} onClick={() => setEditing({ roomId: item.id, date })}><strong>₩{money(daily?.price ?? item.baseRate)}</strong><span>{booking ? guestName(data, booking.guestId) : daily?.closed ? '판매 중지' : '판매 가능 · 1실'}</span></button></td>;
      })}</tr>)}</tbody></table></div>
      {rooms.length === 0 && <Empty title="등록된 객실이 없습니다." action={<button className="button" onClick={() => navigate('settings')}>객실 등록</button>} />}
      <div className="panel-footnote">판매 가능 수량은 객실별 1실 기준입니다. 예약이 들어오면 해당 숙박일의 재고가 자동으로 차감됩니다.</div>
    </Panel>
    {editing && <Modal title="요금·판매 상태 수정" description="시작일부터 종료일까지 선택한 객실에 적용합니다. 기존 예약 금액은 바뀌지 않습니다." onClose={() => setEditing(null)} onSubmit={async (form) => mutate('/rates', { roomId: formText(form, 'roomId'), start: formText(form, 'start'), end: formText(form, 'end'), price: formNumber(form, 'price'), closed: formText(form, 'closed') === 'true' }, 'POST', '요금과 판매 상태를 콘솔에 저장했습니다.')}>
      <Field label="객실" wide><select name="roomId" defaultValue={editing.roomId}>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></Field>
      <Field label="시작일"><input name="start" type="date" required defaultValue={editing.date} min="2000-01-01" max="2100-12-31" /></Field><Field label="종료일 (포함)"><input name="end" type="date" required defaultValue={editing.date} min="2000-01-01" max="2100-12-31" /></Field>
      <Field label="1박 요금 (원)"><input type="number" required name="price" min={0} max={100000000} defaultValue={rate?.price ?? room?.baseRate ?? 0} /></Field><Field label="판매 상태"><select name="closed" defaultValue={String(rate?.closed ?? false)}><option value="false">판매 가능</option><option value="true">판매 중지</option></select></Field>
    </Modal>}
  </>;
}
