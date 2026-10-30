'use client';
import { useState, type ChangeEvent } from 'react';
import type { Claim } from '@/lib/types';
import { download, guestName, money, roomName } from '@/lib/console';
import { Badge, Empty, Field, Icon, Modal, Panel } from './Ui';
import { formNumber, formText, useWorkspace } from './Workspace';

export function Claims() {
  const { data, propertyId, reservations, mutate, busy, navigate } = useWorkspace();
  const [editing, setEditing] = useState<Claim | 'new' | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const claims = data.claims.filter((claim) => claim.propertyId === propertyId);
  const item = editing && editing !== 'new' ? editing : undefined;
  async function upload(event: ChangeEvent<HTMLInputElement>, id: string) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setUploadError('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) { setUploadError('PNG, JPEG, WebP 형식의 2MB 이하 이미지를 선택해 주세요.'); return; }
    setUploading(id);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.')); reader.readAsDataURL(file); });
      await mutate(`/claims/${id}/evidence`, { name: file.name, dataUrl }, 'POST', '증빙 사진을 첨부했습니다.');
    } catch (cause) { setUploadError(cause instanceof Error ? cause.message : '파일을 첨부하지 못했습니다.'); }
    finally { setUploading(null); }
  }
  return <>
    <div className="section-toolbar"><p className="muted">기록과 증빙을 한곳에 모아 두세요.</p><button className="button primary" onClick={() => reservations.length ? setEditing('new') : navigate('reservations')}><Icon name="plus" size={17} />보상 자료 등록</button></div>
    <div className="info-banner"><Icon name="file" /><span>이곳에서는 보상 요청 자료를 준비합니다. 자료 상태를 바꾸거나 내려받아도 예약 채널에 보상 신청이 접수되지는 않습니다.</span></div>
    {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
    <div className="claim-list">{claims.map((claim) => {
      const reservation = reservations.find((value) => value.id === claim.reservationId);
      return <Panel key={claim.id} className="claim-card"><div className="claim-header"><div><div className="work-card-top"><span className="room-pill">{reservation ? roomName(data, reservation.roomId) : '객실'}</span><Badge status={claim.status} /></div><h3>{claim.title}</h3><p>{reservation ? guestName(data, reservation.guestId) : '게스트'} · {claim.reservationId}</p></div><div className="claim-amount"><span>보상 요청 예정액</span><strong>₩{money(claim.amount)}</strong></div></div><p className="claim-description">{claim.description || '상세 내용을 추가해 주세요.'}</p><div className="evidence-list">{claim.evidence.map((evidence) => <a key={evidence.id} href={evidence.dataUrl} download={evidence.name} className="evidence"><img src={evidence.dataUrl} alt={evidence.name} /><span>{evidence.name}</span></a>)}<label className={`upload-evidence ${busy || uploading ? 'disabled' : ''}`}><Icon name="plus" /><span>{uploading === claim.id ? '첨부 중…' : '증빙 사진 추가'}</span><small>2MB 이하 · 최대 10개</small><input type="file" aria-label={`${claim.title} 증빙 사진`} accept="image/png,image/jpeg,image/webp" disabled={busy || !!uploading || claim.evidence.length >= 10} onChange={(event) => void upload(event, claim.id)} /></label></div><div className="claim-actions"><span className="muted">증빙 {claim.evidence.length}개 · {claim.createdAt.slice(0, 10)} 등록</span><div><button className="button" onClick={() => setEditing(claim)}>내용 · 상태 수정</button><button className="button" onClick={() => download(`eh-claim-${claim.id}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), claim, reservation, guest: data.guests.find((guest) => guest.id === reservation?.guestId), room: data.rooms.find((room) => room.id === reservation?.roomId) }, null, 2), 'application/json')}><Icon name="download" size={16} />자료 내려받기 (JSON)</button></div></div></Panel>;
    })}</div>
    {claims.length === 0 && <Panel><Empty title="등록된 보상 자료가 없습니다." description="예약을 선택해 파손 기록과 증빙 사진을 보관하세요." /></Panel>}
    {editing && <Modal title={item ? '보상 자료 수정' : '보상 자료 등록'} onClose={() => setEditing(null)} onSubmit={async (form) => mutate(item ? `/claims/${item.id}` : '/claims', { reservationId: formText(form, 'reservationId'), title: formText(form, 'title'), description: formText(form, 'description'), amount: formNumber(form, 'amount'), status: formText(form, 'status') }, item ? 'PATCH' : 'POST', '보상 자료를 저장했습니다.')}>
      <Field label="관련 예약" wide><select name="reservationId" defaultValue={item?.reservationId ?? reservations[0]?.id} disabled={!!item}>{reservations.map((reservation) => <option key={reservation.id} value={reservation.id}>{guestName(data, reservation.guestId)} · {roomName(data, reservation.roomId)} · {reservation.checkIn}</option>)}</select></Field><Field label="제목 *" wide><input name="title" required maxLength={120} defaultValue={item?.title} placeholder="예: 거실 테이블 상판 파손" /></Field><Field label="상세 기록" wide><textarea name="description" rows={4} maxLength={3000} defaultValue={item?.description} /></Field><Field label="보상 요청 예정액 (원)"><input name="amount" type="number" required min={0} max={100000000} defaultValue={item?.amount ?? 0} /></Field><Field label="자료 상태"><select name="status" defaultValue={item?.status ?? 'collecting'}><option value="collecting">자료 수집</option><option value="ready">자료 준비 완료</option><option value="closed">종결</option></select></Field>
    </Modal>}
  </>;
}
