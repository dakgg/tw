import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { addDays, createStore, seoulToday } from './console-data';
import * as v from './console.validation';
import type { Channel, ConsoleSnapshot, ConsoleStore, InventoryDay, Reservation, ReservationStatus } from './types';

const channels: Channel[] = ['direct', 'airbnb', 'booking', 'trip', 'expedia', 'agoda'];
const workStatuses = ['todo', 'in-progress', 'done'] as const;
const reservationStatuses: ReservationStatus[] = ['confirmed', 'checked-in', 'checked-out', 'cancelled'];
const reservationLabels: Record<ReservationStatus, string> = { confirmed: '예약 확정', 'checked-in': '체크인', 'checked-out': '체크아웃', cancelled: '취소' };

export class ConsoleService {
  private store: ConsoleStore;
  constructor(private readonly file = process.env.EH_TEST_DATA_FILE || resolve(__dirname, '../../../.data/project-eh/standalone.json'), demo = false) {
    if (existsSync(this.file)) {
      const saved = JSON.parse(readFileSync(this.file, 'utf8')) as ConsoleStore;
      const tables = ['properties', 'rooms', 'guests', 'reservations', 'cleaning', 'issues', 'messages', 'claims', 'rates', 'connections', 'activity'] as const;
      if (saved.version !== 1 || !['demo', 'local'].includes(saved.mode) || tables.some((table) => !Array.isArray(saved[table]))) {
        throw new Error('EH 저장 파일 형식을 확인해 주세요. 기존 파일은 덮어쓰지 않았습니다.');
      }
      this.store = saved;
    } else {
      this.store = createStore(demo);
      this.persist(this.store);
    }
  }

  snapshot(): ConsoleSnapshot {
    return { ...structuredClone(this.store), today: seoulToday(), integration: 'unavailable' };
  }

  inventory(propertyId: string, startValue: unknown, daysValue: number): InventoryDay[] {
    this.find(this.store.properties, propertyId);
    const start = v.date(startValue);
    const days = v.integer(daysValue, '조회 일수', 1, 90);
    v.date(addDays(start, days - 1));
    return this.store.rooms.filter((room) => room.propertyId === propertyId).flatMap((room) =>
      Array.from({ length: days }, (_, index) => {
        const date = addDays(start, index);
        const rate = this.store.rates.find((item) => item.roomId === room.id && item.date === date);
        const booking = this.store.reservations.find((item) => item.roomId === room.id && item.status !== 'cancelled' && item.checkIn <= date && item.checkOut > date);
        return { roomId: room.id, date, price: rate?.price ?? room.baseRate, closed: rate?.closed ?? false, available: !booking && !rate?.closed, reservationId: booking?.id ?? null };
      }),
    );
  }

  saveProperty(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const property = { id: id ?? randomUUID(), name: v.text(data.name, '숙소 이름', 80), address: v.text(data.address, '주소', 200, true) };
      if (id) Object.assign(this.find(store.properties, id), property);
      else {
        store.properties.push(property);
        channels.filter((channel) => channel !== 'direct').forEach((channel) => store.connections.push({ id: `${property.id}-${channel}`, propertyId: property.id, channel: channel as Exclude<Channel, 'direct'>, externalId: '', status: 'not-connected', updatedAt: null }));
      }
      this.log(store, property.id, `숙소 설정 저장: ${property.name}`);
      return property;
    });
  }

  saveRoom(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const existing = id ? this.find(store.rooms, id) : undefined;
      const propertyId = existing?.propertyId ?? v.text(data.propertyId, '숙소');
      this.find(store.properties, propertyId);
      const room = { id: id ?? randomUUID(), propertyId, name: v.text(data.name, '객실 이름', 40), type: v.text(data.type, '객실 유형', 80), capacity: v.integer(data.capacity, '정원', 1, 30), baseRate: v.integer(data.baseRate, '기본 요금') };
      if (store.rooms.some((item) => item.propertyId === propertyId && item.name === room.name && item.id !== id)) throw new ConflictException('같은 이름의 객실이 있습니다.');
      if (existing && store.reservations.some((item) => item.roomId === id && ['confirmed', 'checked-in'].includes(item.status) && item.checkOut >= seoulToday() && item.guests > room.capacity)) throw new ConflictException('예정 예약의 인원보다 정원을 줄일 수 없습니다.');
      if (existing) Object.assign(existing, room);
      else store.rooms.push(room);
      this.log(store, propertyId, `${room.name} 객실 설정 저장`);
      return room;
    });
  }

  saveReservation(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const existing = id ? this.find(store.reservations, id) : undefined;
      if (existing && ['cancelled', 'checked-out'].includes(existing.status)) throw new ConflictException('취소되거나 체크아웃한 예약은 수정할 수 없습니다.');
      const propertyId = existing?.propertyId ?? v.text(data.propertyId, '숙소');
      const room = this.find(store.rooms, v.text(data.roomId, '객실'));
      if (room.propertyId !== propertyId) throw new BadRequestException('선택한 숙소의 객실이 아닙니다.');
      const checkIn = v.date(data.checkIn);
      const checkOut = v.date(data.checkOut);
      const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / 86400000;
      if (nights < 1 || nights > 365) throw new BadRequestException('숙박 기간은 1~365박이어야 합니다.');
      const guests = v.integer(data.guests, '인원', 1, room.capacity);
      const total = v.integer(data.total, '예약 금액');
      const commission = v.integer(data.commission, '수수료', 0, total);
      if (existing?.settled && (total !== existing.total || commission !== existing.commission)) throw new ConflictException('정산 완료 예약은 정산을 대기로 바꾼 뒤 금액을 수정해 주세요.');
      if (existing?.status === 'checked-in' && (checkIn > seoulToday() || checkOut < seoulToday())) throw new BadRequestException('투숙 중인 예약의 체크아웃은 오늘 이후여야 합니다.');
      if (store.reservations.some((item) => item.id !== id && item.roomId === room.id && item.status !== 'cancelled' && item.checkIn < checkOut && item.checkOut > checkIn)) throw new ConflictException('해당 객실에 겹치는 예약이 있습니다. 다른 객실이나 날짜를 선택해 주세요.');
      if (store.rates.some((item) => item.roomId === room.id && item.closed && item.date >= checkIn && item.date < checkOut)) throw new ConflictException('판매 중지된 날짜가 포함되어 있습니다.');
      let guest = data.guestId ? this.find(store.guests, v.text(data.guestId, '게스트')) : existing && data.guestName === undefined ? this.find(store.guests, existing.guestId) : undefined;
      if (guest && guest.propertyId !== propertyId) throw new BadRequestException('선택한 숙소의 게스트가 아닙니다.');
      if (!guest) {
        const name = v.text(data.guestName, '게스트 이름', 100);
        const email = v.text(data.email, '이메일', 200, true).toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('이메일 형식이 올바르지 않습니다.');
        guest = email ? store.guests.find((item) => item.propertyId === propertyId && item.email.toLowerCase() === email && item.name === name) : undefined;
        if (!guest) { guest = { id: randomUUID(), propertyId, name, email, note: '' }; store.guests.push(guest); }
      }
      const reservation: Reservation = {
        id: existing?.id ?? `EH-${randomUUID().slice(0, 8).toUpperCase()}`, propertyId, roomId: room.id, guestId: guest.id,
        channel: v.choice(data.channel, channels, '채널'), checkIn, checkOut, guests, total, commission,
        status: existing?.status ?? 'confirmed', settled: existing?.settled ?? false, note: v.text(data.note, '메모', 2000, true), createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (existing) Object.assign(existing, reservation); else store.reservations.push(reservation);
      const task = store.cleaning.find((item) => item.reservationId === reservation.id);
      if (task) {
        if (task.date !== checkOut || task.roomId !== room.id) task.status = 'todo';
        task.date = checkOut; task.roomId = room.id;
      } else store.cleaning.push({ id: randomUUID(), propertyId, roomId: room.id, reservationId: reservation.id, date: checkOut, assignee: '', status: 'todo', note: '체크아웃 후 객실 정비' });
      this.log(store, propertyId, `${room.name} · ${guest.name} 예약 ${existing ? '변경' : '등록'}`);
      return reservation;
    });
  }

  reservationStatus(id: string, body: unknown) {
    const status = v.choice(v.object(body).status, reservationStatuses, '예약 상태');
    return this.change((store) => {
      const reservation = this.find(store.reservations, id);
      const transitions: Record<ReservationStatus, ReservationStatus[]> = { confirmed: ['checked-in', 'cancelled'], 'checked-in': ['checked-out'], 'checked-out': [], cancelled: [] };
      if (status === reservation.status) return reservation;
      if (!transitions[reservation.status].includes(status)) throw new ConflictException('허용되지 않는 예약 상태 변경입니다.');
      const today = seoulToday();
      if (status === 'checked-in' && (today < reservation.checkIn || today >= reservation.checkOut)) throw new ConflictException('체크인은 예약한 숙박 기간에만 가능합니다.');
      if (status === 'checked-out' && today < reservation.checkOut) throw new ConflictException('체크아웃 예정일 전입니다. 예약 날짜를 먼저 조정해 주세요.');
      if (status === 'cancelled' && reservation.settled) throw new ConflictException('정산 완료 예약은 정산을 대기로 바꾼 뒤 취소해 주세요.');
      reservation.status = status;
      if (status === 'cancelled') store.cleaning = store.cleaning.filter((item) => item.reservationId !== id);
      this.log(store, reservation.propertyId, `${reservation.id} 예약 상태 변경: ${reservationLabels[status]}`);
      return reservation;
    });
  }

  settlement(id: string, body: unknown) {
    const settled = v.bool(v.object(body).settled, '정산');
    return this.change((store) => {
      const reservation = this.find(store.reservations, id);
      if (reservation.status === 'cancelled') throw new ConflictException('취소된 예약은 정산할 수 없습니다.');
      reservation.settled = settled;
      this.log(store, reservation.propertyId, `${reservation.id} 정산 ${settled ? '완료' : '대기'}`);
      return reservation;
    });
  }

  saveRates(body: unknown) {
    const data = v.object(body);
    return this.change((store) => {
      const room = this.find(store.rooms, v.text(data.roomId, '객실'));
      const start = v.date(data.start); const end = v.date(data.end);
      const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
      if (days < 1 || days > 90) throw new BadRequestException('요금 변경 범위는 1~90일이어야 합니다.');
      const price = v.integer(data.price, '요금'); const closed = v.bool(data.closed, '판매 중지');
      if (closed && store.reservations.some((item) => item.roomId === room.id && item.status !== 'cancelled' && item.checkIn <= end && item.checkOut > start)) throw new ConflictException('예약이 있는 날짜는 판매 중지할 수 없습니다.');
      for (let i = 0; i < days; i++) {
        const date = addDays(start, i);
        const existing = store.rates.find((item) => item.roomId === room.id && item.date === date);
        if (existing) Object.assign(existing, { price, closed }); else store.rates.push({ roomId: room.id, date, price, closed });
      }
      this.log(store, room.propertyId, `${room.name} · ${start}~${end} 요금·판매 상태 저장 (OTA 미전송)`);
    });
  }

  saveCleaning(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const existing = id ? this.find(store.cleaning, id) : undefined;
      const room = this.find(store.rooms, existing?.roomId ?? v.text(data.roomId, '객실'));
      const date = existing?.reservationId ? existing.date : v.date(data.date);
      const values = { date, assignee: v.text(data.assignee, '담당자', 80, true), note: v.text(data.note, '메모', 2000, true), status: v.choice(data.status, workStatuses, '작업 상태') };
      if (existing) Object.assign(existing, values);
      else store.cleaning.push({ id: randomUUID(), propertyId: room.propertyId, roomId: room.id, ...values });
      this.log(store, room.propertyId, `${room.name} 청소 작업 저장`);
    });
  }

  saveIssue(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const existing = id ? this.find(store.issues, id) : undefined;
      const room = this.find(store.rooms, existing?.roomId ?? v.text(data.roomId, '객실'));
      const values = { title: v.text(data.title, '제목', 120), description: v.text(data.description, '상세 내용', 3000, true), priority: v.choice(data.priority, ['normal', 'urgent'] as const, '우선순위'), status: v.choice(data.status, workStatuses, '작업 상태') };
      if (existing) Object.assign(existing, values);
      else store.issues.push({ id: randomUUID(), propertyId: room.propertyId, roomId: room.id, createdAt: new Date().toISOString(), ...values });
      this.log(store, room.propertyId, `${room.name} 객실 이슈: ${values.title}`);
    });
  }

  guestNote(id: string, body: unknown) {
    const note = v.text(v.object(body).note, '게스트 노트', 3000, true);
    return this.change((store) => {
      const guest = this.find(store.guests, id); guest.note = note;
      this.log(store, guest.propertyId, `${guest.name} 게스트 노트 저장`);
    });
  }

  saveDraft(body: unknown) {
    const data = v.object(body);
    return this.change((store) => {
      const reservation = this.find(store.reservations, v.text(data.reservationId, '예약'));
      const draft = { id: randomUUID(), propertyId: reservation.propertyId, reservationId: reservation.id, text: v.text(data.text, '메시지', 3000), direction: 'draft' as const, read: true, createdAt: new Date().toISOString() };
      store.messages.push(draft);
      this.log(store, reservation.propertyId, `${reservation.id} 답장 초안 저장 (미전송)`);
      return draft;
    });
  }

  readMessages(reservationId: string) {
    return this.change((store) => {
      this.find(store.reservations, reservationId);
      store.messages.filter((item) => item.reservationId === reservationId).forEach((item) => { item.read = true; });
    });
  }

  saveClaim(body: unknown, id?: string) {
    const data = v.object(body);
    return this.change((store) => {
      const existing = id ? this.find(store.claims, id) : undefined;
      const reservation = this.find(store.reservations, existing?.reservationId ?? v.text(data.reservationId, '예약'));
      const values = { title: v.text(data.title, '제목', 120), description: v.text(data.description, '내용', 3000, true), amount: v.integer(data.amount, '청구 금액'), status: v.choice(data.status, ['collecting', 'ready', 'closed'] as const, '자료 상태') };
      if (existing) Object.assign(existing, values);
      else store.claims.push({ id: randomUUID(), propertyId: reservation.propertyId, reservationId: reservation.id, evidence: [], createdAt: new Date().toISOString(), ...values });
      this.log(store, reservation.propertyId, `보상 자료 저장: ${values.title}`);
    });
  }

  addEvidence(id: string, body: unknown) {
    const data = v.object(body);
    const name = v.text(data.name, '파일명', 180);
    const dataUrl = v.text(data.dataUrl, '증빙 이미지', 2800000);
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) throw new BadRequestException('PNG, JPEG, WebP 이미지만 첨부할 수 있습니다.');
    const bytes = Buffer.from(match[2], 'base64');
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid || bytes.length > 2 * 1024 * 1024) throw new BadRequestException('유효한 2MB 이하의 이미지를 선택해 주세요.');
    return this.change((store) => {
      const claim = this.find(store.claims, id);
      if (claim.evidence.length >= 10) throw new BadRequestException('건당 최대 10개까지 첨부할 수 있습니다.');
      claim.evidence.push({ id: randomUUID(), name, dataUrl, createdAt: new Date().toISOString() });
      this.log(store, claim.propertyId, `보상 증빙 첨부: ${name}`);
    });
  }

  saveConnection(id: string, body: unknown) {
    const data = v.object(body);
    return this.change((store) => {
      const connection = this.find(store.connections, id);
      connection.externalId = v.text(data.externalId, '숙소·호텔 ID', 120, true);
      connection.status = connection.externalId ? 'setup-saved' : 'not-connected';
      connection.updatedAt = new Date().toISOString();
      this.log(store, connection.propertyId, `${connection.channel} 연결 설정 저장 · 실제 연동 대기`);
    });
  }

  sync(id: string): never {
    this.find(this.store.connections, id);
    throw new ServiceUnavailableException('공식 OTA 어댑터가 연결되지 않았습니다. 예약·재고 동기화와 메시지 전송은 아직 사용할 수 없습니다.');
  }

  private find<T extends { id: string }>(items: T[], id: string): T {
    const item = items.find((value) => value.id === id);
    if (!item) throw new NotFoundException('요청한 항목을 찾을 수 없습니다.');
    return item;
  }

  private change<T>(operation: (store: ConsoleStore) => T): T {
    // A single synchronous transaction prevents concurrent HTTP writes from losing updates.
    const next = structuredClone(this.store);
    const result = operation(next);
    this.persist(next);
    this.store = next;
    return structuredClone(result);
  }

  private persist(store: ConsoleStore): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
    const temp = `${this.file}.tmp`;
    writeFileSync(temp, JSON.stringify(store), { mode: 0o600 });
    renameSync(temp, this.file);
  }

  private log(store: ConsoleStore, propertyId: string, text: string): void {
    store.activity.unshift({ id: randomUUID(), propertyId, text, createdAt: new Date().toISOString() });
    store.activity = store.activity.slice(0, 200);
  }
}
