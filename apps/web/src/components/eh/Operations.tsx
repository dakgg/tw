'use client';
import { useState } from 'react';
import type { CleaningTask, RoomIssue, WorkStatus } from '@/lib/types';
import { dayLabel, roomName } from '@/lib/console';
import { Badge, Empty, Field, Icon, Modal, Panel, Search } from './Ui';
import { formText, useWorkspace } from './Workspace';

const stages: { id: WorkStatus; label: string }[] = [{ id: 'todo', label: '대기' }, { id: 'in-progress', label: '진행 중' }, { id: 'done', label: '완료' }];

export function Cleaning() {
  const { data, propertyId, rooms, mutate, busy, navigate } = useWorkspace();
  const [date, setDate] = useState(data.today);
  const [assignee, setAssignee] = useState('');
  const [editing, setEditing] = useState<CleaningTask | 'new' | null>(null);
  const tasks = data.cleaning.filter((item) => item.propertyId === propertyId && (!date || item.date === date) && item.assignee.toLowerCase().includes(assignee.toLowerCase()));
  const item = editing && editing !== 'new' ? editing : undefined;
  const overdue = data.cleaning.filter((task) => task.propertyId === propertyId && task.date < data.today && task.status !== 'done').length;
  return <>
    <div className="section-toolbar"><div className="filter-inline"><label>청소일 <input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><button className="button" onClick={() => setDate('')}>전체 일정</button><Search value={assignee} onChange={setAssignee} placeholder="담당자 검색" /></div><button className="button primary" onClick={() => rooms.length ? setEditing('new') : navigate('settings')}><Icon name="plus" size={16} />청소 일정 추가</button></div>
    {overdue > 0 && <div className="info-banner">이전 날짜의 미완료 청소가 {overdue}건 있습니다. <button className="text-button" onClick={() => { setDate(''); setAssignee(''); }}>전체 일정에서 확인 →</button></div>}
    <div className="kanban">{stages.map((stage) => <section className={`kanban-column stage-${stage.id}`} key={stage.id}><div className="kanban-heading"><h2><i />{stage.label}</h2><span>{tasks.filter((task) => task.status === stage.id).length}</span></div>{tasks.filter((task) => task.status === stage.id).sort((a, b) => a.date.localeCompare(b.date)).map((task) => <article className="work-card" key={task.id}>
      <div className="work-card-top"><span className="room-pill">{roomName(data, task.roomId)}</span><small>{task.reservationId ? '예약 자동 생성' : '수동 일정'}</small></div><h3>객실 정비 · {dayLabel(task.date)}</h3><p>{task.note || '등록된 메모가 없습니다.'}</p><div className="assignee"><span className="avatar small">{task.assignee.slice(0, 1) || '–'}</span>{task.assignee || '담당자 미지정'}</div><div className="work-card-actions"><button className="small-button" onClick={() => setEditing(task)}>상세 · 담당자</button><select aria-label={`${roomName(data, task.roomId)} ${task.date} 청소 상태`} value={task.status} disabled={busy} onChange={(event) => void mutate(`/cleaning/${task.id}`, { ...task, status: event.target.value }, 'PATCH', '청소 상태를 변경했습니다.').catch(() => {})}>{stages.map((value) => <option key={value.id} value={value.id}>{value.label}</option>)}</select></div>
    </article>)}{!tasks.some((task) => task.status === stage.id) && <div className="kanban-empty">해당 일정이 없습니다.</div>}</section>)}</div>
    <p className="help-text">담당자 검색은 운영자용 필터입니다. 청소 관계사 전용 계정과 접근 권한은 아직 제공되지 않습니다.</p>
    {editing && <Modal title={item ? '청소 일정 수정' : '청소 일정 추가'} description={item?.reservationId ? '예약에 연결된 청소일은 예약의 체크아웃 날짜를 따라갑니다.' : undefined} onClose={() => setEditing(null)} onSubmit={async (form) => mutate(item ? `/cleaning/${item.id}` : '/cleaning', { roomId: formText(form, 'roomId'), date: formText(form, 'date'), assignee: formText(form, 'assignee'), note: formText(form, 'note'), status: formText(form, 'status') }, item ? 'PATCH' : 'POST', '청소 일정을 저장했습니다.')}>
      <Field label="객실"><select name="roomId" defaultValue={item?.roomId ?? rooms[0]?.id} disabled={!!item}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></Field><Field label="청소일"><input name="date" required type="date" defaultValue={item?.date ?? (date || data.today)} readOnly={!!item?.reservationId} min="2000-01-01" max="2100-12-31" /></Field>
      <Field label="담당자"><input name="assignee" defaultValue={item?.assignee} maxLength={80} placeholder="이름 또는 청소 업체" /></Field><Field label="진행 상태"><select name="status" defaultValue={item?.status ?? 'todo'}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></Field><Field label="작업 메모" wide><textarea name="note" rows={3} maxLength={2000} defaultValue={item?.note} /></Field>
    </Modal>}
  </>;
}

export function Issues() {
  const { data, propertyId, rooms, mutate, busy, navigate } = useWorkspace();
  const [filter, setFilter] = useState('open');
  const [editing, setEditing] = useState<RoomIssue | 'new' | null>(null);
  const items = data.issues.filter((item) => item.propertyId === propertyId && (filter === 'all' || (filter === 'open' ? item.status !== 'done' : item.status === 'done')));
  const item = editing && editing !== 'new' ? editing : undefined;
  return <>
    <div className="section-toolbar"><div className="tabs">{[{ id: 'open', label: '처리할 이슈' }, { id: 'done', label: '완료' }, { id: 'all', label: '전체' }].map((tab) => <button key={tab.id} className={filter === tab.id ? 'active' : ''} onClick={() => setFilter(tab.id)}>{tab.label}</button>)}</div><button className="button primary" onClick={() => rooms.length ? setEditing('new') : navigate('settings')}><Icon name="plus" size={16} />이슈 등록</button></div>
    <div className="issue-grid">{items.map((issue) => <Panel className="issue-card" key={issue.id}><div className="work-card-top"><span className="room-pill">{roomName(data, issue.roomId)}</span><span className={`badge ${issue.priority === 'urgent' ? 'priority-urgent' : ''}`}>{issue.priority === 'urgent' ? '긴급' : '일반'}</span></div><h3>{issue.title}</h3><p>{issue.description || '상세 내용이 없습니다.'}</p><div className="issue-status"><Badge status={issue.status} /><small>{issue.createdAt.slice(0, 10)} 등록</small></div><div className="work-card-actions"><button className="small-button" onClick={() => setEditing(issue)}>상세 수정</button><select aria-label={`${issue.title} 상태`} value={issue.status} disabled={busy} onChange={(event) => void mutate(`/issues/${issue.id}`, { ...issue, status: event.target.value }, 'PATCH', '이슈 상태를 변경했습니다.').catch(() => {})}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></div></Panel>)}</div>
    {items.length === 0 && <Panel><Empty title="처리할 이슈가 없습니다." description="객실 점검 중 발견한 사항을 기록해 주세요." /></Panel>}
    {editing && <Modal title={item ? '객실 이슈 수정' : '객실 이슈 등록'} onClose={() => setEditing(null)} onSubmit={async (form) => mutate(item ? `/issues/${item.id}` : '/issues', { roomId: formText(form, 'roomId'), title: formText(form, 'title'), description: formText(form, 'description'), priority: formText(form, 'priority'), status: formText(form, 'status') }, item ? 'PATCH' : 'POST', '객실 이슈를 저장했습니다.')}>
      <Field label="객실"><select name="roomId" defaultValue={item?.roomId ?? rooms[0]?.id} disabled={!!item}>{rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></Field><Field label="우선순위"><select name="priority" defaultValue={item?.priority ?? 'normal'}><option value="normal">일반</option><option value="urgent">긴급</option></select></Field>
      <Field label="제목 *" wide><input name="title" required maxLength={120} defaultValue={item?.title} placeholder="예: 욕실 조명 교체" /></Field><Field label="상세 내용" wide><textarea name="description" rows={4} maxLength={3000} defaultValue={item?.description} /></Field><Field label="상태"><select name="status" defaultValue={item?.status ?? 'todo'}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></Field>
    </Modal>}
  </>;
}
