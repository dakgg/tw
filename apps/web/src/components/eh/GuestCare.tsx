'use client';
import { useState } from 'react';
import type { Guest } from '@/lib/types';
import { guestName, money, roomName, timeLabel } from '@/lib/console';
import { ChannelBadge, Empty, Field, Icon, Modal, Panel, Search } from './Ui';
import { formText, useWorkspace } from './Workspace';

export function Messages() {
  const { data, reservations, propertyId, mutate, busy } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const messages = data.messages.filter((item) => item.propertyId === propertyId);
  const threads = reservations.filter((item) => guestName(data, item.guestId).toLowerCase().includes(query.toLowerCase()) && (!onlyUnread || messages.some((message) => message.reservationId === item.id && !message.read))).sort((a, b) => {
    const unread = (id: string) => messages.filter((message) => message.reservationId === id && !message.read).length;
    return unread(b.id) - unread(a.id) || b.checkIn.localeCompare(a.checkIn);
  });
  const reservation = reservations.find((item) => item.id === selected);
  return <>
    <div className="info-banner"><Icon name="message" /><span>OTA 미연결 상태에서는 답장을 <strong>초안으로 저장</strong>합니다. 게스트에게 전송되지 않습니다.</span></div>
    <Panel className="inbox"><aside className="thread-list"><div className="thread-filter"><Search value={query} onChange={setQuery} placeholder="게스트 검색" /><label className="checkbox"><input type="checkbox" checked={onlyUnread} onChange={(event) => setOnlyUnread(event.target.checked)} />읽지 않은 대화만</label></div>{threads.map((item) => {
      const conversation = messages.filter((message) => message.reservationId === item.id);
      const unread = conversation.filter((message) => !message.read).length;
      const last = conversation[conversation.length - 1];
      return <button className={`thread ${selected === item.id ? 'selected' : ''}`} key={item.id} onClick={() => { setSelected(item.id); setDraft(''); }}><div className="thread-title"><strong>{guestName(data, item.guestId)}</strong>{unread > 0 && <b>{unread}</b>}</div><p>{last ? `${last.direction === 'draft' ? '[초안] ' : ''}${last.text}` : '저장된 대화가 없습니다.'}</p><ChannelBadge channel={item.channel} /></button>;
    })}{threads.length === 0 && <Empty title="대화가 없습니다." description="예약을 등록하면 답장 초안을 준비할 수 있습니다." />}</aside><div className="conversation">{reservation ? <>
      <div className="conversation-heading"><div><h2>{guestName(data, reservation.guestId)}</h2><p>{roomName(data, reservation.roomId)} · {reservation.checkIn} → {reservation.checkOut}</p></div><button disabled={busy} className="button" onClick={() => void mutate(`/messages/${reservation.id}/read`, {}, 'PATCH', '읽음으로 표시했습니다.').catch(() => {})}><Icon name="check" size={16} />읽음 표시</button></div>
      <div className="message-list">{messages.filter((message) => message.reservationId === selected).map((message) => <div key={message.id} className={`message-bubble ${message.direction}`}><span>{message.direction === 'draft' ? '답장 초안 · 미전송' : guestName(data, reservation.guestId)}</span><p>{message.text}</p><small>{timeLabel(message.createdAt)}</small></div>)}{!messages.some((message) => message.reservationId === selected) && <Empty title="아직 저장된 메시지가 없습니다." description="게스트에게 보낼 안내를 초안으로 작성해 보세요." />}</div>
      <form className="message-compose" onSubmit={async (event) => { event.preventDefault(); try { await mutate('/messages/drafts', { reservationId: reservation.id, text: draft }, 'POST', '답장 초안을 저장했습니다. 외부로 전송되지 않았습니다.'); setDraft(''); } catch {} }}><textarea aria-label="답장 초안" placeholder="게스트에게 보낼 답장을 작성하세요…" value={draft} maxLength={3000} onChange={(event) => setDraft(event.target.value)} required rows={3} /><div><small>초안은 이 워크스페이스에만 저장됩니다.</small><button className="button primary" disabled={busy || !draft.trim()}>초안 저장 <Icon name="file" size={16} /></button></div></form>
    </> : <Empty title="게스트 대화를 선택해 주세요." description="왼쪽 목록에서 예약별 메시지를 확인할 수 있습니다." />}</div></Panel>
  </>;
}

export function Guests() {
  const { data, guests, reservations, mutate } = useWorkspace();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Guest | null>(null);
  const items = guests.filter((guest) => `${guest.name} ${guest.email} ${guest.note}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="section-toolbar"><Search value={query} onChange={setQuery} placeholder="게스트 이름, 이메일, 노트 검색" /><span className="muted">총 {items.length}명의 게스트</span></div>
    <div className="guest-grid">{items.map((guest) => {
      const stays = reservations.filter((item) => item.guestId === guest.id && item.status !== 'cancelled');
      const completed = stays.filter((item) => item.status === 'checked-out').length;
      return <Panel className="guest-card" key={guest.id}><div className="guest-card-heading"><span className="avatar large">{guest.name.slice(0, 1)}</span><div><h3>{guest.name}</h3><p>{guest.email || '이메일 미등록'}</p></div>{completed >= 2 && <span className="badge status-done">재방문</span>}</div><div className="guest-facts"><div><span>예약 횟수</span><strong>{stays.length}회</strong></div><div><span>완료한 숙박</span><strong>{completed}회</strong></div><div><span>총 예약 금액</span><strong>₩{money(stays.reduce((sum, item) => sum + item.total, 0))}</strong></div></div><div className={`guest-note ${guest.note ? '' : 'muted'}`}><Icon name="file" size={16} /><p>{guest.note || '취향이나 요청 사항을 기록해 보세요.'}</p></div><button className="button full-width" onClick={() => setEditing(guest)}>게스트 노트 수정</button></Panel>;
    })}</div>
    {items.length === 0 && <Panel><Empty title="등록된 게스트가 없습니다." description="예약을 등록하면 게스트 정보가 함께 저장됩니다." /></Panel>}
    {editing && <Modal title={`${editing.name} · 게스트 노트`} description="응대에 필요한 취향과 요청 사항을 기록하세요." onClose={() => setEditing(null)} onSubmit={async (form) => mutate(`/guests/${editing.id}/note`, { note: formText(form, 'note') }, 'PATCH', '게스트 노트를 저장했습니다.')}><Field label="게스트 노트" wide><textarea rows={6} name="note" maxLength={3000} defaultValue={editing.note} placeholder="예: 조용한 객실 선호, 여분의 베개 요청" /></Field></Modal>}
  </>;
}
