'use client';
import { useState } from 'react';
import type { Reservation } from '@/lib/types';
import { addDays, channelNames, dayLabel, guestName, money, nights, roomName } from '@/lib/console';
import { Badge, ChannelBadge, Empty, Field, Icon, Modal, Panel, Search } from './Ui';
import { formNumber, formText, useWorkspace } from './Workspace';

export function ReservationForm({ reservation, onClose }: { reservation?: Reservation; onClose: () => void }) {
  const { data, propertyId, rooms, guests, mutate } = useWorkspace();
  const [guestId, setGuestId] = useState(reservation?.guestId ?? '');
  const [roomId, setRoomId] = useState(reservation?.roomId ?? rooms[0]?.id ?? '');
  const [start, setStart] = useState(reservation?.checkIn ?? data.today);
  const [end, setEnd] = useState(reservation?.checkOut ?? addDays(data.today, 1));
  const room = rooms.find((item) => item.id === roomId);
  const estimate = Math.max(1, nights({ checkIn: start, checkOut: end }) || 1) * (room?.baseRate ?? 0);
  return <Modal title={reservation ? '예약 수정' : '새 예약 등록'} description="수동으로 등록한 예약은 콘솔 재고에 반영되며, 체크아웃 날짜에 청소 일정이 만들어집니다. OTA에는 전송되지 않습니다." onClose={onClose} onSubmit={async (form) => {
    await mutate(reservation ? `/reservations/${reservation.id}` : '/reservations', {
      propertyId, roomId: formText(form, 'roomId'), guestId: formText(form, 'guestId') || undefined,
      guestName: formText(form, 'guestName'), email: formText(form, 'email'), channel: formText(form, 'channel'),
      checkIn: formText(form, 'checkIn'), checkOut: formText(form, 'checkOut'), guests: formNumber(form, 'guests'),
      total: formNumber(form, 'total'), commission: formNumber(form, 'commission'), note: formText(form, 'note'),
    }, reservation ? 'PATCH' : 'POST', '예약과 청소 일정을 저장했습니다.');
  }}>
    <Field label="게스트 선택" wide><select name="guestId" value={guestId} onChange={(event) => setGuestId(event.target.value)}><option value="">새 게스트</option>{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.name} {guest.email ? `(${guest.email})` : ''}</option>)}</select></Field>
    {!guestId && <><Field label="게스트 이름 *"><input name="guestName" required maxLength={100} placeholder="예: 김지우" /></Field><Field label="이메일"><input name="email" type="email" maxLength={200} placeholder="guest@example.com" /></Field></>}
    <Field label="객실 *"><select name="roomId" required value={roomId} onChange={(event) => setRoomId(event.target.value)}>{rooms.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></Field>
    <Field label="예약 채널"><select name="channel" defaultValue={reservation?.channel ?? 'direct'}>{Object.entries(channelNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
    <Field label="체크인 *"><input name="checkIn" type="date" required min="2000-01-01" max="2100-12-30" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
    <Field label="체크아웃 *"><input name="checkOut" type="date" required min={start ? addDays(start, 1) : '2000-01-02'} max="2100-12-31" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
    <Field label={`투숙 인원 * (최대 ${room?.capacity ?? 0}명)`}><input name="guests" type="number" min={1} max={room?.capacity ?? 1} required defaultValue={reservation?.guests ?? 1} /></Field>
    <Field label="예약 총액 (원) *"><input key={reservation ? reservation.id : `${roomId}-${start}-${end}`} name="total" type="number" min={0} max={100000000} step={1} required defaultValue={reservation?.total ?? estimate} /></Field>
    <Field label="채널 수수료 (원)"><input name="commission" type="number" min={0} max={100000000} step={1} required defaultValue={reservation?.commission ?? 0} /></Field>
    <Field label="운영 메모" wide><textarea name="note" rows={3} maxLength={2000} placeholder="체크인 요청이나 운영 메모를 입력하세요." defaultValue={reservation?.note} /></Field>
  </Modal>;
}

export function Reservations() {
  const { data, reservations, rooms, busy, mutate, navigate } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list');
  const [week, setWeek] = useState(data.today);
  const [editing, setEditing] = useState<Reservation | 'new' | null>(null);
  const [cancel, setCancel] = useState<Reservation | null>(null);
  const filtered = reservations.filter((item) => (filter === 'all' || item.status === filter) && `${guestName(data, item.guestId)} ${item.id} ${roomName(data, item.roomId)} ${channelNames[item.channel]}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  const dates = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  return <>
    <div className="section-toolbar"><div className="tabs"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>예약 목록</button><button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>객실 달력</button></div><button className="button primary" onClick={() => rooms.length ? setEditing('new') : navigate('settings')}><Icon name="plus" size={17} />{rooms.length ? '예약 등록' : '객실 먼저 등록'}</button></div>
    <Panel>
      <div className="filter-bar"><Search value={query} onChange={setQuery} placeholder="게스트, 객실, 예약 번호 검색" /><select aria-label="예약 상태 필터" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">모든 상태</option><option value="confirmed">예약 확정</option><option value="checked-in">투숙 중</option><option value="checked-out">체크아웃</option><option value="cancelled">취소</option></select><span className="result-count">총 {filtered.length}건</span></div>
      {view === 'list' ? <div className="table-scroll"><table><thead><tr><th>예약 · 게스트</th><th>객실</th><th>숙박 일정</th><th>채널</th><th>예약 금액</th><th>상태</th><th>관리</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
        <td><strong>{guestName(data, item.guestId)}</strong><small>{item.id} · {item.guests}명</small></td><td>{roomName(data, item.roomId)}</td><td>{item.checkIn.slice(5)} → {item.checkOut.slice(5)}<small>{nights(item)}박 · {item.checkIn.slice(0, 4)}년</small></td><td><ChannelBadge channel={item.channel} /></td><td className="numeric">₩{money(item.total)}</td><td><Badge status={item.status} /></td>
        <td><div className="row-actions">{!['cancelled', 'checked-out'].includes(item.status) && <button disabled={busy} className="small-button" onClick={() => setEditing(item)}>수정</button>}{item.status === 'confirmed' && <><button className="small-button accent" disabled={busy || item.checkIn > data.today || item.checkOut <= data.today} onClick={() => void mutate(`/reservations/${item.id}/status`, { status: 'checked-in' }, 'PATCH', '체크인 처리했습니다.').catch(() => {})}>체크인</button><button className="small-button danger-text" disabled={busy} onClick={() => setCancel(item)}>취소</button></>}{item.status === 'checked-in' && <button className="small-button" disabled={busy || item.checkOut > data.today} onClick={() => void mutate(`/reservations/${item.id}/status`, { status: 'checked-out' }, 'PATCH', '체크아웃 처리했습니다.').catch(() => {})}>체크아웃</button>}</div></td>
      </tr>)}</tbody></table>{filtered.length === 0 && <Empty title="조건에 맞는 예약이 없습니다." description="검색 조건을 바꾸거나 새 예약을 등록해 주세요." />}</div> : <>
        <div className="calendar-toolbar"><button className="button" onClick={() => setWeek(addDays(week, -7))}>← 이전 주</button><label>시작일 <input type="date" aria-label="달력 시작일" value={week} min="2000-01-01" max="2100-12-24" onChange={(event) => event.target.value && setWeek(event.target.value)} /></label><button className="button" onClick={() => setWeek(addDays(week, 7))}>다음 주 →</button></div>
        <div className="table-scroll"><table className="calendar-table"><thead><tr><th>객실</th>{dates.map((date) => <th className={date === data.today ? 'today' : ''} key={date}>{dayLabel(date)}</th>)}</tr></thead><tbody>{rooms.map((room) => <tr key={room.id}><th>{room.name}<small>{room.type}</small></th>{dates.map((date) => {
          const reservation = filtered.find((item) => item.status !== 'cancelled' && item.roomId === room.id && item.checkIn <= date && item.checkOut > date);
          return <td key={date}>{reservation ? <button className={`booking-chip ${reservation.channel}`} onClick={() => { if (!['checked-out', 'cancelled'].includes(reservation.status)) setEditing(reservation); }} disabled={reservation.status === 'checked-out'}>{guestName(data, reservation.guestId)}<small>{channelNames[reservation.channel]}</small></button> : <span className="calendar-empty">—</span>}</td>;
        })}</tr>)}</tbody></table></div>
      </>}
    </Panel>
    <p className="help-text">체크인 당일부터 체크아웃 전날까지 객실 재고를 사용합니다. 체크인·체크아웃 버튼은 해당 일정에 맞춰 활성화됩니다.</p>
    {editing && <ReservationForm reservation={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    {cancel && <Modal title="예약 취소" description={`${guestName(data, cancel.guestId)}님의 ${roomName(data, cancel.roomId)} 예약을 취소하면 재고가 복원되고 연결된 청소 일정이 제거됩니다. OTA 예약은 별도로 취소해야 합니다.`} onClose={() => setCancel(null)} submitLabel="예약 취소 처리" onSubmit={async () => mutate(`/reservations/${cancel.id}/status`, { status: 'cancelled' }, 'PATCH', '예약을 취소했습니다.')}><p className="wide">{cancel.checkIn} → {cancel.checkOut} · ₩{money(cancel.total)}</p></Modal>}
  </>;
}
