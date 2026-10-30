import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConsoleService } from './console.service';
import { createStore, seoulToday } from './console-data';

const today = '2026-10-30';
let directory: string;
let service: ConsoleService;
let propertyId: string;
let roomId: string;
const oldFile = process.env.EH_TEST_DATA_FILE;

function booking(overrides: Record<string, unknown> = {}) {
  return { propertyId, roomId, guestName: '김지우', email: 'guest@example.com', channel: 'direct', checkIn: today, checkOut: '2026-11-02', guests: 2, total: 480000, commission: 0, note: '', ...overrides };
}

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-30T03:00:00Z'));
  directory = mkdtempSync(join(tmpdir(), 'eh-test-'));
  process.env.EH_TEST_DATA_FILE = join(directory, 'store.json');
  service = new ConsoleService();
  propertyId = service.saveProperty({ name: '테스트 숙소', address: '서울' }).id;
  roomId = service.saveRoom({ propertyId, name: '201호', type: '트윈', capacity: 2, baseRate: 160000 }).id;
});

afterEach(() => {
  jest.useRealTimers();
  rmSync(directory, { recursive: true, force: true });
  if (oldFile === undefined) delete process.env.EH_TEST_DATA_FILE; else process.env.EH_TEST_DATA_FILE = oldFile;
});

describe('EH reservations and inventory', () => {
  it('creates a reservation, guest and linked checkout cleaning task atomically', () => {
    const reservation = service.saveReservation(booking());
    const state = service.snapshot();
    expect(state.reservations).toHaveLength(1);
    expect(state.guests).toHaveLength(1);
    expect(state.cleaning).toEqual([expect.objectContaining({ reservationId: reservation.id, roomId, date: '2026-11-02', status: 'todo' })]);
    expect(service.inventory(propertyId, today, 4).map((day) => day.available)).toEqual([false, false, false, true]);
  });

  it('rejects overlapping reservations from different channels without partial records', () => {
    service.saveReservation(booking({ channel: 'airbnb' }));
    const before = service.snapshot();
    expect(() => service.saveReservation(booking({ channel: 'booking', guestName: 'New Guest', email: 'new@example.com' }))).toThrow(ConflictException);
    expect(service.snapshot()).toEqual(before);
  });

  it('allows a new check-in on the previous checkout date', () => {
    service.saveReservation(booking());
    service.saveReservation(booking({ checkIn: '2026-11-02', checkOut: '2026-11-04' }));
    expect(service.snapshot().reservations).toHaveLength(2);
    expect(service.snapshot().guests).toHaveLength(1);
  });

  it('moves linked cleaning when a reservation date changes', () => {
    const reservation = service.saveReservation(booking());
    service.saveReservation(booking({ checkOut: '2026-11-03' }), reservation.id);
    expect(service.snapshot().cleaning[0].date).toBe('2026-11-03');
    expect(service.snapshot().cleaning).toHaveLength(1);
  });

  it('reassigns an edited reservation to a new guest without modifying the previous guest', () => {
    const reservation = service.saveReservation(booking());
    service.saveReservation(booking({ guestName: '다른 게스트', email: 'other@example.com' }), reservation.id);
    const snapshot = service.snapshot();
    expect(snapshot.guests).toHaveLength(2);
    expect(snapshot.reservations[0].guestId).not.toBe(reservation.guestId);
    expect(snapshot.guests.find((guest) => guest.id === reservation.guestId)?.name).toBe('김지우');
  });

  it('allows early departure by changing checkout to today before checking out', () => {
    jest.setSystemTime(new Date('2026-10-29T03:00:00Z'));
    const reservation = service.saveReservation(booking({ checkIn: '2026-10-29' }));
    service.reservationStatus(reservation.id, { status: 'checked-in' });
    jest.setSystemTime(new Date('2026-10-30T03:00:00Z'));
    service.saveReservation(booking({ checkIn: '2026-10-29', checkOut: today }), reservation.id);
    service.reservationStatus(reservation.id, { status: 'checked-out' });
    expect(service.snapshot().cleaning[0].date).toBe(today);
    expect(service.inventory(propertyId, today, 1)[0].available).toBe(true);
  });

  it('moves the cleaning room with the reservation and resets completed cleaning', () => {
    const reservation = service.saveReservation(booking());
    const task = service.snapshot().cleaning[0];
    service.saveCleaning({ ...task, status: 'done' }, task.id);
    const room = service.saveRoom({ propertyId, name: '202호', type: '트윈', capacity: 2, baseRate: 160000 });
    service.saveReservation(booking({ roomId: room.id }), reservation.id);
    expect(service.snapshot().cleaning[0]).toEqual(expect.objectContaining({ roomId: room.id, status: 'todo' }));
  });

  it('cancels a reservation, releases inventory, removes only its cleaning and prevents revival', () => {
    const reservation = service.saveReservation(booking());
    service.saveCleaning({ roomId, date: today, assignee: '', note: '', status: 'todo' });
    service.reservationStatus(reservation.id, { status: 'cancelled' });
    expect(service.inventory(propertyId, today, 1)[0].available).toBe(true);
    expect(service.snapshot().cleaning).toHaveLength(1);
    expect(service.snapshot().cleaning[0].reservationId).toBeUndefined();
    expect(() => service.reservationStatus(reservation.id, { status: 'confirmed' })).toThrow(ConflictException);
  });

  it('enforces lifecycle transitions and check-in dates', () => {
    const future = service.saveReservation(booking({ checkIn: '2026-11-03', checkOut: '2026-11-04' }));
    expect(() => service.reservationStatus(future.id, { status: 'checked-in' })).toThrow(ConflictException);
    const reservation = service.saveReservation(booking());
    expect(() => service.reservationStatus(reservation.id, { status: 'checked-out' })).toThrow(ConflictException);
    service.reservationStatus(reservation.id, { status: 'checked-in' });
    expect(() => service.reservationStatus(reservation.id, { status: 'cancelled' })).toThrow(ConflictException);
    expect(() => service.reservationStatus(reservation.id, { status: 'checked-out' })).toThrow(ConflictException);
    jest.setSystemTime(new Date('2026-11-02T03:00:00Z'));
    service.reservationStatus(reservation.id, { status: 'checked-out' });
    expect(service.snapshot().reservations.find((item) => item.id === reservation.id)?.status).toBe('checked-out');
  });

  it.each([
    { checkIn: '2026-02-30' }, { checkIn: 'not-a-date' }, { checkOut: today }, { checkOut: '2026-10-29' },
    { guests: 0 }, { guests: 3 }, { total: -1 }, { commission: 480001 }, { total: '100' },
    { channel: 'unknown' }, { email: 'invalid' }, { checkOut: '2028-01-01' },
  ])('rejects invalid reservation fields %j', (invalid) => {
    expect(() => service.saveReservation(booking(invalid))).toThrow(BadRequestException);
    expect(service.snapshot().reservations).toHaveLength(0);
    expect(service.snapshot().guests).toHaveLength(0);
  });

  it('rejects cross-property room and guest references', () => {
    const other = service.saveProperty({ name: '다른 숙소' });
    expect(() => service.saveReservation(booking({ propertyId: other.id }))).toThrow(BadRequestException);
    const reservation = service.saveReservation(booking());
    const otherRoom = service.saveRoom({ propertyId: other.id, name: '301호', type: '트윈', capacity: 2, baseRate: 100000 });
    expect(() => service.saveReservation(booking({ propertyId: other.id, roomId: otherRoom.id, guestId: reservation.guestId }))).toThrow(BadRequestException);
  });

  it('rejects an invalid channel before committing a new guest', () => {
    expect(() => service.saveReservation(booking({ channel: 'invalid' }))).toThrow();
    expect(service.snapshot().guests).toHaveLength(0);
  });

  it('honors date-specific rates and closed inventory without changing existing reservation totals', () => {
    service.saveRates({ roomId, start: today, end: '2026-10-31', price: 200000, closed: true });
    expect(service.inventory(propertyId, today, 3).map((day) => [day.price, day.available])).toEqual([[200000, false], [200000, false], [160000, true]]);
    expect(() => service.saveReservation(booking())).toThrow(ConflictException);
    service.saveRates({ roomId, start: today, end: '2026-10-31', price: 210000, closed: false });
    const reservation = service.saveReservation(booking());
    expect(() => service.saveRates({ roomId, start: today, end: today, price: 100000, closed: true })).toThrow(ConflictException);
    service.saveRates({ roomId, start: today, end: today, price: 100000, closed: false });
    expect(service.snapshot().reservations[0].total).toBe(reservation.total);
  });

  it('bounds inventory and rate ranges and validates boolean values', () => {
    expect(() => service.inventory(propertyId, today, 0)).toThrow(BadRequestException);
    expect(() => service.inventory(propertyId, today, 91)).toThrow(BadRequestException);
    expect(() => service.inventory(propertyId, '2100-12-31', 2)).toThrow(BadRequestException);
    expect(() => service.saveRates({ roomId, start: today, end: '2027-12-31', price: 1, closed: false })).toThrow(BadRequestException);
    expect(() => service.saveRates({ roomId, start: today, end: today, price: 1, closed: 'false' })).toThrow(BadRequestException);
  });

  it('prevents reducing capacity below an upcoming reservation and duplicate room names', () => {
    service.saveReservation(booking());
    expect(() => service.saveRoom({ name: '201호', type: '트윈', capacity: 1, baseRate: 100000 }, roomId)).toThrow(ConflictException);
    expect(() => service.saveRoom({ propertyId, name: '201호', type: '트윈', capacity: 2, baseRate: 100000 })).toThrow(ConflictException);
  });

  it('guards settled amounts and cancelled reservations from settlement', () => {
    const reservation = service.saveReservation(booking());
    service.settlement(reservation.id, { settled: true });
    expect(() => service.saveReservation(booking({ total: 300000 }), reservation.id)).toThrow(ConflictException);
    expect(() => service.reservationStatus(reservation.id, { status: 'cancelled' })).toThrow(ConflictException);
    service.settlement(reservation.id, { settled: false });
    service.reservationStatus(reservation.id, { status: 'cancelled' });
    expect(() => service.settlement(reservation.id, { settled: true })).toThrow(ConflictException);
  });
});

describe('EH operations, storage and integration truthfulness', () => {
  it('saves cleaning, issue status and guest notes durably', () => {
    const reservation = service.saveReservation(booking());
    const task = service.snapshot().cleaning[0];
    service.saveCleaning({ ...task, date: today, assignee: '청소팀', status: 'in-progress', note: '베개 추가' }, task.id);
    expect(service.snapshot().cleaning[0].date).toBe('2026-11-02');
    service.saveIssue({ roomId, title: '조명 교체', description: '욕실', priority: 'urgent', status: 'todo' });
    const issue = service.snapshot().issues[0];
    service.saveIssue({ ...issue, status: 'done' }, issue.id);
    service.guestNote(reservation.guestId, { note: '조용한 방 선호' });
    const reopened = new ConsoleService().snapshot();
    expect(reopened.cleaning[0].assignee).toBe('청소팀');
    expect(reopened.issues[0].status).toBe('done');
    expect(reopened.guests[0].note).toBe('조용한 방 선호');
  });

  it('only saves outbound messages as drafts', () => {
    const reservation = service.saveReservation(booking());
    const draft = service.saveDraft({ reservationId: reservation.id, text: '안녕하세요', direction: 'sent' });
    expect(draft.direction).toBe('draft');
    expect(service.snapshot().integration).toBe('unavailable');
    expect(() => service.saveDraft({ reservationId: reservation.id, text: '  ' })).toThrow(BadRequestException);
  });

  it('marks incoming messages read only for the selected reservation', () => {
    const demo = createStore(true, today);
    writeFileSync(process.env.EH_TEST_DATA_FILE!, JSON.stringify(demo));
    const seeded = new ConsoleService();
    seeded.readMessages('EH-1002');
    const messages = seeded.snapshot().messages;
    expect(messages.find((item) => item.reservationId === 'EH-1002')?.read).toBe(true);
    expect(messages.find((item) => item.reservationId === 'EH-1001')?.read).toBe(false);
  });

  it('keeps saved connection settings disconnected and rejects unsupported synchronization', () => {
    const connection = service.snapshot().connections[0];
    service.saveConnection(connection.id, { externalId: 'hotel-123' });
    expect(service.snapshot().connections[0].status).toBe('setup-saved');
    expect(() => service.sync(connection.id)).toThrow(ServiceUnavailableException);
    service.saveConnection(connection.id, { externalId: '' });
    expect(service.snapshot().connections[0].status).toBe('not-connected');
  });

  it('stores claim evidence and rejects fake image payloads, invalid types and too many attachments', () => {
    const reservation = service.saveReservation(booking());
    service.saveClaim({ reservationId: reservation.id, title: '테이블 파손', description: '점검 기록', amount: 85000, status: 'collecting' });
    const claim = service.snapshot().claims[0];
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=';
    service.addEvidence(claim.id, { name: 'photo.png', dataUrl: png });
    expect(new ConsoleService().snapshot().claims[0].evidence[0].dataUrl).toBe(png);
    expect(() => service.addEvidence(claim.id, { name: 'fake.png', dataUrl: 'data:image/png;base64,SGVsbG8=' })).toThrow(BadRequestException);
    expect(() => service.addEvidence(claim.id, { name: 'script.svg', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' })).toThrow(BadRequestException);
    for (let i = 1; i < 10; i++) service.addEvidence(claim.id, { name: 'photo.png', dataUrl: png });
    expect(() => service.addEvidence(claim.id, { name: 'extra.png', dataUrl: png })).toThrow(BadRequestException);
  });

  it('does not overwrite existing records when demo mode changes', () => {
    service.saveReservation(booking());
    const saved = new ConsoleService(process.env.EH_TEST_DATA_FILE, true).snapshot();
    expect(saved.mode).toBe('local');
    expect(saved.reservations).toHaveLength(1);
    expect(saved.properties).toHaveLength(1);
  });

  it('rolls back in-memory changes when durable storage fails', () => {
    const before = service.snapshot();
    mkdirSync(`${process.env.EH_TEST_DATA_FILE}.tmp`);
    expect(() => service.saveReservation(booking())).toThrow();
    expect(service.snapshot()).toEqual(before);
    expect(JSON.parse(readFileSync(process.env.EH_TEST_DATA_FILE!, 'utf8')).reservations).toHaveLength(0);
  });

  it('fails closed on invalid storage without replacing the file', () => {
    writeFileSync(process.env.EH_TEST_DATA_FILE!, '{bad json');
    expect(() => new ConsoleService()).toThrow();
    expect(readFileSync(process.env.EH_TEST_DATA_FILE!, 'utf8')).toBe('{bad json');
  });

  it('protects service state from mutations of returned snapshots', () => {
    service.snapshot().rooms[0].name = 'wrong';
    expect(service.snapshot().rooms[0].name).toBe('201호');
  });

  it('rejects invalid request bodies and unknown references', () => {
    expect(() => service.saveReservation(null)).toThrow(BadRequestException);
    expect(() => service.saveProperty([])).toThrow(BadRequestException);
    expect(() => service.guestNote('unknown', { note: '' })).toThrow(NotFoundException);
  });

  it('uses Korean dates across UTC midnight boundaries', () => {
    jest.setSystemTime(new Date('2026-10-29T15:30:00Z'));
    expect(seoulToday()).toBe('2026-10-30');
  });
});
