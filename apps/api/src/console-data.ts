import type { Channel, ConsoleStore, Reservation } from './types';

export function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(date: string, count: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function createStore(demo: boolean, today = seoulToday()): ConsoleStore {
  const store: ConsoleStore = {
    version: 1, mode: demo ? 'demo' : 'local', properties: [], rooms: [], guests: [], reservations: [],
    cleaning: [], issues: [], messages: [], claims: [], rates: [], connections: [], activity: [],
  };
  if (!demo) return store;
  const now = new Date().toISOString();
  store.properties = [
    { id: 'p1', name: '집서울 · 마제스틱', address: '서울특별시 중구 · 예시 숙소' },
    { id: 'p2', name: '집서울 · 서울역', address: '서울특별시 용산구 · 예시 숙소' },
  ];
  store.rooms = Array.from({ length: 12 }, (_, i) => ({
    id: `room-${i + 1}`, propertyId: i < 8 ? 'p1' : 'p2', name: `${i < 8 ? 201 + i : 301 + i - 8}호`,
    type: i % 3 === 0 ? '패밀리 스위트' : '디럭스 트윈', capacity: i % 3 === 0 ? 4 : 2,
    baseRate: i % 3 === 0 ? 240000 : 160000,
  }));
  const names = ['Emma Wilson', '김지우', 'Yuki Tanaka', '이서준', 'Chen Wei', 'Olivia Martin', '박민서', 'Noah Brown'];
  store.guests = names.map((name, i) => ({ id: `guest-${i + 1}`, propertyId: 'p1', name, email: `guest${i + 1}@example.com`, note: i === 0 ? '조용한 객실 선호 · 여분의 베개 요청' : '' }));
  store.guests.push({ id: 'guest-9', propertyId: 'p2', name: 'Alex Kim', email: 'guest9@example.com', note: '' });
  const channels: Channel[] = ['airbnb', 'booking', 'trip', 'direct', 'expedia', 'agoda'];
  const stays = [[-2, 2], [0, 3], [0, 2], [-3, 0], [-1, 1], [1, 4], [2, 5], [-5, -2]];
  store.reservations = stays.map(([start, end], i): Reservation => ({
    id: `EH-${1001 + i}`, propertyId: 'p1', roomId: `room-${i + 1}`, guestId: `guest-${i + 1}`,
    channel: channels[i % channels.length], checkIn: addDays(today, start), checkOut: addDays(today, end), guests: 2,
    total: (end - start) * store.rooms[i].baseRate, commission: i === 3 ? 0 : Math.round((end - start) * store.rooms[i].baseRate * 0.12),
    settled: i === 7, status: end < 0 ? 'checked-out' : start < 0 ? 'checked-in' : 'confirmed', note: '', createdAt: now,
  }));
  store.reservations.push({ id: 'EH-1009', propertyId: 'p2', roomId: 'room-9', guestId: 'guest-9', channel: 'booking', checkIn: today, checkOut: addDays(today, 2), guests: 2, total: 320000, commission: 38400, settled: false, status: 'confirmed', note: '', createdAt: now });
  store.cleaning = store.reservations.map((reservation, i) => ({
    id: `clean-${i}`, propertyId: reservation.propertyId, roomId: reservation.roomId, reservationId: reservation.id,
    date: reservation.checkOut, assignee: i % 2 ? '김매니저' : '서울 클린팀', status: reservation.checkOut < today ? 'done' : 'todo', note: '체크아웃 후 객실 정비',
  }));
  store.issues = [
    { id: 'issue-1', propertyId: 'p1', roomId: 'room-4', title: '욕실 조명 교체', description: '세면대 위 조명이 깜박입니다. 청소 시 확인해 주세요.', priority: 'urgent', status: 'todo', createdAt: now },
    { id: 'issue-2', propertyId: 'p1', roomId: 'room-6', title: '에어컨 필터 정기 점검', description: '필터 세척 및 작동 상태 확인', priority: 'normal', status: 'in-progress', createdAt: now },
  ];
  store.messages = [
    { id: 'message-1', propertyId: 'p1', reservationId: 'EH-1002', text: '안녕하세요! 오늘 오후 3시쯤 도착할 예정이에요. 짐을 먼저 맡길 수 있을까요?', direction: 'inbound', read: false, createdAt: now },
    { id: 'message-2', propertyId: 'p1', reservationId: 'EH-1001', text: 'Could we get an extra blanket, please?', direction: 'inbound', read: false, createdAt: now },
    { id: 'message-3', propertyId: 'p1', reservationId: 'EH-1003', text: '체크인 안내 감사합니다. 곧 뵙겠습니다!', direction: 'inbound', read: true, createdAt: now },
  ];
  store.claims = [{ id: 'claim-1', propertyId: 'p1', reservationId: 'EH-1008', title: '거실 테이블 상판 파손', description: '체크아웃 점검 중 발견. 수리 견적과 현장 사진을 정리해 주세요.', amount: 85000, status: 'collecting', evidence: [], createdAt: now }];
  for (const property of store.properties) {
    for (const channel of channels.filter((value): value is Exclude<Channel, 'direct'> => value !== 'direct')) {
      store.connections.push({ id: `${property.id}-${channel}`, propertyId: property.id, channel, externalId: '', status: 'not-connected', updatedAt: null });
    }
  }
  store.activity = [{ id: 'activity-1', propertyId: 'p1', text: 'EH 체험 워크스페이스가 준비되었습니다.', createdAt: now }];
  return store;
}
