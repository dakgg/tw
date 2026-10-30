'use client';
import { useState } from 'react';
import { authRequest } from '@/lib/auth';
import type { ChannelConnection, Property, Room } from '@/lib/types';
import { channelNames, money } from '@/lib/console';
import { Empty, Field, Icon, Modal, Panel } from './Ui';
import { formNumber, formText, useWorkspace } from './Workspace';

export function Channels() {
  const { data, propertyId, mutate, user } = useWorkspace();
  const [editing, setEditing] = useState<ChannelConnection | null>(null);
  const connections = data.connections.filter((item) => item.propertyId === propertyId);
  return <>
    <div className="connection-intro"><div><span className="tiny-label">CHANNEL MANAGER</span><h2>채널은 여럿, 콘솔은 하나.</h2><p>{user.displayName}님의 계정에 예약 채널별 숙소 정보를 등록하세요.</p></div><div className="connection-count"><strong>0<span> / {connections.length}</span></strong><small>실제 연결된 채널</small></div></div>
    <div className="info-banner"><Icon name="link" /><span><strong>외부 채널 미연결</strong> 연결 설정은 현재 로그인한 계정에만 저장됩니다. 실시간 예약·재고 동기화와 메시지 송수신은 공식 연동 후 이용할 수 있습니다.</span></div>
    <div className="connection-grid">{connections.map((connection) => <Panel key={connection.id} className="connection-card"><div className={`provider-logo ${connection.channel}`}>{connection.channel === 'airbnb' ? 'A' : connection.channel === 'booking' ? 'B.' : connection.channel === 'trip' ? 'T' : connection.channel === 'expedia' ? 'E' : 'a'}</div><h3>{channelNames[connection.channel]}</h3><p>{connection.channel === 'airbnb' ? '숙소 계정 승인 방식' : '채널매니저 지정 방식'}</p><div className="connection-status"><span className="status-dot offline" />{connection.status === 'setup-saved' ? '설정 저장됨 · 연동 대기' : '미연결'}</div><dl><dt>숙소·호텔 ID</dt><dd>{connection.externalId || '미등록'}</dd><dt>마지막 동기화</dt><dd>동기화 이력 없음</dd></dl><button className="button full-width" onClick={() => setEditing(connection)}>연결 정보 {connection.externalId ? '수정' : '등록'} <Icon name="arrow" size={16} /></button></Panel>)}</div>
    <Panel title="연동 준비 가이드" description="소개서에 안내된 연결 흐름입니다. 현재 워크스페이스에서는 첫 단계의 연결 정보를 준비할 수 있습니다."><div className="guide-grid"><div><b>01</b><h3>예약 채널 선택</h3><p>현재 운영 중인 채널과 숙소·호텔 ID를 확인합니다.</p></div><div><b>02</b><h3>공식 연결 승인</h3><p>Airbnb 계정 승인 또는 각 채널의 익스트라넷에서 채널매니저 지정을 진행합니다. 채널별 파트너 연동이 선행되어야 합니다.</p></div><div><b>03</b><h3>동기화 확인</h3><p>실제 연동 후 객실 매핑과 예약·재고 반영을 검증하고 운영을 시작합니다.</p></div></div></Panel>
    {editing && <Modal title={`${channelNames[editing.channel]} 연결 정보`} description="숙소 식별 정보를 보관합니다. 이 정보를 저장해도 실제 채널 연결이나 데이터 가져오기가 시작되지는 않습니다. 비밀번호와 API 키는 입력하지 마세요." onClose={() => setEditing(null)} submitLabel="설정 저장" onSubmit={async (form) => mutate(`/connections/${editing.id}`, { externalId: formText(form, 'externalId') }, 'PATCH', '연결 정보를 저장했습니다. 실제 연동은 대기 상태입니다.')}><Field label="숙소·호텔 ID" wide><input name="externalId" maxLength={120} defaultValue={editing.externalId} placeholder="채널에서 사용하는 숙소 ID" /></Field><p className="help-text wide">값을 비워 저장하면 등록된 식별 정보를 지울 수 있습니다.</p></Modal>}
  </>;
}

export function Settings() {
  const { data, propertyId, property, rooms, mutate, user } = useWorkspace();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [propertyEdit, setPropertyEdit] = useState<Property | 'new' | null>(null);
  const [roomEdit, setRoomEdit] = useState<Room | 'new' | null>(null);
  const selectedProperty = propertyEdit && propertyEdit !== 'new' ? propertyEdit : undefined;
  const room = roomEdit && roomEdit !== 'new' ? roomEdit : undefined;
  return <>
    <Panel title="내 계정" description="계정마다 숙소·예약·OTA 연결 설정을 독립적으로 보관합니다." action={<button className="button" onClick={() => setPasswordOpen(true)}>비밀번호 변경</button>}><div className="account-details"><span className="avatar large">{user.displayName.slice(0, 1)}</span><div><h3>{user.displayName}</h3><p>@{user.username}</p></div><small>가입일 {user.createdAt.slice(0, 10)}</small></div></Panel>
    <Panel title="숙소 정보" description="상단 숙소 선택 메뉴에서 여러 숙소를 전환할 수 있습니다." action={<button className="button" onClick={() => setPropertyEdit('new')}><Icon name="plus" size={16} />숙소 추가</button>}>{property ? <div className="property-details"><span className="property-icon"><Icon name="home" size={30} /></span><div><h3>{property.name}</h3><p>{property.address || '주소 미등록'}</p><small>{rooms.length}개 객실 · {data.mode === 'demo' ? '체험 워크스페이스' : '개인 워크스페이스'}</small></div><button className="button" onClick={() => setPropertyEdit(property)}>정보 수정</button></div> : <Empty title="첫 숙소를 등록해 주세요." description="숙소와 객실을 등록하면 예약 관리를 시작할 수 있습니다." action={<button className="button primary" onClick={() => setPropertyEdit('new')}>숙소 등록</button>} />}</Panel>
    <Panel title="객실 구성" description="객실 하나를 판매 가능한 재고 1실로 관리합니다." action={<button className="button primary" disabled={!property} onClick={() => setRoomEdit('new')}><Icon name="plus" size={16} />객실 추가</button>}><div className="table-scroll"><table><thead><tr><th>객실</th><th>객실 유형</th><th>최대 인원</th><th>기본 1박 요금</th><th>관리</th></tr></thead><tbody>{rooms.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.type}</td><td>{item.capacity}명</td><td>₩{money(item.baseRate)}</td><td><button className="small-button" onClick={() => setRoomEdit(item)}>수정</button></td></tr>)}</tbody></table></div>{rooms.length === 0 && <Empty title="등록된 객실이 없습니다." description="객실 이름과 정원, 기본 요금을 입력해 주세요." />}</Panel>
    {passwordOpen && <Modal title="비밀번호 변경" description="변경하면 다른 기기의 기존 로그인은 모두 해제됩니다." onClose={() => setPasswordOpen(false)} onSubmit={async (form) => {
      if (formText(form, 'password') !== formText(form, 'confirmPassword')) throw new Error('새 비밀번호 확인이 일치하지 않습니다.');
      await authRequest('/password', { currentPassword: formText(form, 'currentPassword'), password: formText(form, 'password') }, user.id);
    }}><Field label="현재 비밀번호" wide><input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128} /></Field><Field label="새 비밀번호 (10자 이상)" wide><input type="password" name="password" autoComplete="new-password" required minLength={10} maxLength={128} /></Field><Field label="새 비밀번호 확인" wide><input type="password" name="confirmPassword" autoComplete="new-password" required minLength={10} maxLength={128} /></Field></Modal>}
    {propertyEdit && <Modal title={selectedProperty ? '숙소 정보 수정' : '숙소 추가'} onClose={() => setPropertyEdit(null)} onSubmit={async (form) => mutate(selectedProperty ? `/properties/${selectedProperty.id}` : '/properties', { name: formText(form, 'name'), address: formText(form, 'address') }, selectedProperty ? 'PATCH' : 'POST', '숙소 정보를 저장했습니다.')}><Field label="숙소 이름 *" wide><input name="name" required maxLength={80} defaultValue={selectedProperty?.name} placeholder="예: 집서울 · 서울역" /></Field><Field label="주소" wide><input name="address" maxLength={200} defaultValue={selectedProperty?.address} /></Field></Modal>}
    {roomEdit && <Modal title={room ? '객실 수정' : '객실 추가'} onClose={() => setRoomEdit(null)} onSubmit={async (form) => mutate(room ? `/rooms/${room.id}` : '/rooms', { propertyId, name: formText(form, 'name'), type: formText(form, 'type'), capacity: formNumber(form, 'capacity'), baseRate: formNumber(form, 'baseRate') }, room ? 'PATCH' : 'POST', '객실 정보를 저장했습니다.')}><Field label="객실 이름 *"><input name="name" required maxLength={40} defaultValue={room?.name} placeholder="예: 201호" /></Field><Field label="객실 유형 *"><input name="type" required maxLength={80} defaultValue={room?.type} placeholder="예: 디럭스 트윈" /></Field><Field label="최대 인원 *"><input name="capacity" type="number" min={1} max={30} required defaultValue={room?.capacity ?? 2} /></Field><Field label="기본 1박 요금 (원) *"><input name="baseRate" type="number" min={0} max={100000000} required defaultValue={room?.baseRate ?? 160000} /></Field></Modal>}
  </>;
}
