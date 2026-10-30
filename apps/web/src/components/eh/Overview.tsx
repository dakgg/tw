'use client';
import { useState } from 'react';
import { channelNames, dayLabel, guestName, money, roomName, timeLabel } from '@/lib/console';
import { Badge, ChannelBadge, Empty, Icon, Panel, Stat } from './Ui';
import { useWorkspace } from './Workspace';

export function Overview() {
  const { data, propertyId, rooms, reservations, navigate } = useWorkspace();
  const [tab, setTab] = useState<'arrivals' | 'departures' | 'staying'>('arrivals');
  const active = reservations.filter((item) => item.status !== 'cancelled');
  const arrivals = active.filter((item) => item.checkIn === data.today);
  const departures = active.filter((item) => item.checkOut === data.today);
  const staying = active.filter((item) => item.checkIn <= data.today && item.checkOut > data.today);
  const cleaning = data.cleaning.filter((item) => item.propertyId === propertyId && item.date <= data.today && item.status !== 'done');
  const issues = data.issues.filter((item) => item.propertyId === propertyId && item.status !== 'done');
  const unread = data.messages.filter((item) => item.propertyId === propertyId && !item.read).length;
  const monthSales = active.filter((item) => item.checkOut.slice(0, 7) === data.today.slice(0, 7)).reduce((sum, item) => sum + item.total, 0);
  const list = { arrivals, departures, staying }[tab];
  return <>
    <div className="welcome-strip"><div><span className="sun-mark">✳</span><div><h2>오늘도, 빈틈없는 운영을.</h2><p>체크인 {arrivals.length}건과 체크아웃 {departures.length}건이 예정되어 있어요.</p></div></div><button className="text-button" onClick={() => navigate('reservations')}>오늘의 일정 보기 <Icon name="arrow" size={17} /></button></div>
    <div className="stats-grid">
      <Stat label="오늘 체크인" value={arrivals.length} unit="건" hint={`체크아웃 ${departures.length}건 예정`} icon="calendar" />
      <Stat label="오늘 객실 점유율" value={rooms.length ? Math.round(staying.length / rooms.length * 100) : 0} unit="%" hint={`전체 ${rooms.length}실 중 ${staying.length}실 예약`} icon="home" />
      <Stat label="처리할 청소" value={cleaning.length} unit="건" hint="오늘 및 이전 미완료 일정" icon="clean" />
      <Stat label="이번 달 예약 매출" value={money(monthSales)} unit="원" hint="체크아웃 월 기준 · 수수료 차감 전" icon="chart" />
    </div>
    <div className="overview-grid">
      <Panel title="오늘의 예약" description={dayLabel(data.today)} action={<button className="text-button" onClick={() => navigate('reservations')}>전체 보기 <Icon name="arrow" size={16} /></button>}>
        <div className="tabs panel-tabs">{([{ id: 'arrivals', label: '체크인', count: arrivals.length }, { id: 'departures', label: '체크아웃', count: departures.length }, { id: 'staying', label: '재실 예정', count: staying.length }] as const).map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>
        <div className="table-scroll"><table><thead><tr><th>게스트</th><th>객실</th><th>예약 채널</th><th>상태</th></tr></thead><tbody>{list.map((item) => <tr key={item.id} onClick={() => navigate('reservations')}><td><div className="guest-cell"><span className="avatar">{guestName(data, item.guestId).slice(0, 1)}</span><div><strong>{guestName(data, item.guestId)}</strong><small>{item.guests}명 · {item.checkIn.slice(5)} → {item.checkOut.slice(5)}</small></div></div></td><td>{roomName(data, item.roomId)}</td><td><ChannelBadge channel={item.channel} /></td><td><Badge status={item.status} /></td></tr>)}</tbody></table></div>
        {list.length === 0 && <Empty title="오늘 예정된 예약이 없습니다." description="새 예약이 등록되면 이곳에 표시됩니다." />}
      </Panel>
      <Panel title="지금 확인할 일" description="운영에 필요한 다음 단계" className="todo-panel">
        {[{ icon: 'clean', title: '객실 정비', detail: '미완료 청소 일정을 확인하세요', count: cleaning.length, section: 'cleaning' as const }, { icon: 'message', title: '게스트 메시지', detail: '아직 읽지 않은 메시지가 있어요', count: unread, section: 'messages' as const }, { icon: 'tool', title: '객실 점검', detail: '진행 중인 수리와 점검', count: issues.length, section: 'issues' as const }].map((task) => <button className="todo-item" key={task.title} onClick={() => navigate(task.section)}><span className={`task-icon ${task.icon}`}><Icon name={task.icon} /></span><span><strong>{task.title}</strong><small>{task.detail}</small></span><b>{task.count}</b><Icon name="arrow" size={16} /></button>)}
        <div className="tip"><span className="tiny-label">EH TIP</span><p>예약에 맞춰 청소 일정이 자동으로 만들어집니다. 담당자를 지정해 보세요.</p></div>
      </Panel>
    </div>
    <div className="overview-grid bottom-grid">
      <Panel title="객실 현황" description="오늘 숙박일 기준" action={<button className="text-button" onClick={() => navigate('rates')}>재고 관리 <Icon name="arrow" size={16} /></button>}>
        <div className="room-grid">{rooms.map((room) => {
          const occupied = staying.some((reservation) => reservation.roomId === room.id);
          const closed = data.rates.some((rate) => rate.roomId === room.id && rate.date === data.today && rate.closed);
          return <button key={room.id} className={`room-tile ${occupied ? 'occupied' : closed ? 'closed' : ''}`} onClick={() => navigate('rates')}><span>{room.name}<Icon name="home" size={16} /></span><small>{room.type}</small><b><i />{occupied ? '예약 있음' : closed ? '판매 중지' : '예약 가능'}</b></button>;
        })}</div>{rooms.length === 0 && <Empty title="객실을 먼저 등록해 주세요." action={<button className="button" onClick={() => navigate('settings')}>객실 등록</button>} />}
        <div className="panel-footnote">예약 가능 여부는 콘솔에 등록된 예약과 판매 중지 설정을 기준으로 합니다.</div>
      </Panel>
      <Panel title="최근 활동" description="워크스페이스의 변경 기록">
        <div className="activity-list">{data.activity.filter((item) => item.propertyId === propertyId).slice(0, 5).map((item) => <div key={item.id}><span className="activity-dot" /><div><p>{item.text}</p><small>{timeLabel(item.createdAt)}</small></div></div>)}</div>
      </Panel>
    </div>
    <Panel className="channel-strip"><div><span className="tiny-label">BOOKING CHANNELS</span><h3>예약 채널을 한곳에서</h3></div><div className="channel-wordmarks">{Object.entries(channelNames).filter(([key]) => key !== 'direct').map(([key, name]) => <span key={key} className={key}>{name}</span>)}</div><button className="button" onClick={() => navigate('channels')}>연결 설정 <Icon name="arrow" size={16} /></button></Panel>
  </>;
}
