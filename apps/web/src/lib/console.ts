import type { Channel, ConsoleSnapshot, Reservation } from './types';

export const channelNames: Record<Channel, string> = { direct: '직접 예약', airbnb: 'Airbnb', booking: 'Booking.com', trip: 'Trip.com', expedia: 'Expedia', agoda: 'Agoda' };
export const statusNames = { confirmed: '예약 확정', 'checked-in': '투숙 중', 'checked-out': '체크아웃', cancelled: '취소', todo: '대기', 'in-progress': '진행 중', done: '완료', collecting: '자료 수집', ready: '자료 준비 완료', closed: '종결' };
export const money = (value: number) => new Intl.NumberFormat('ko-KR').format(value);
export const dayLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' }).format(new Date(`${value}T12:00:00+09:00`));
export const timeLabel = (value: string) => new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Seoul' }).format(new Date(value));
export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export const nights = (reservation: Pick<Reservation, 'checkIn' | 'checkOut'>) => (Date.parse(reservation.checkOut) - Date.parse(reservation.checkIn)) / 86400000;
export function roomName(data: ConsoleSnapshot, id: string) { return data.rooms.find((room) => room.id === id)?.name ?? '객실 없음'; }
export function guestName(data: ConsoleSnapshot, id: string) { return data.guests.find((guest) => guest.id === id)?.name ?? '게스트'; }

export async function request<T>(path = '', body?: unknown, method = 'POST', accountId?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accountId) headers['X-EH-Account'] = accountId;
  const response = await fetch(`/api/console${path}`, { method: body === undefined ? 'GET' : method, credentials: 'same-origin', headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('eh:unauthorized'));
    const error = await response.json().catch(() => null);
    throw new Error(Array.isArray(error?.message) ? error.message.join(' · ') : error?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  return response.json() as Promise<T>;
}

export function download(name: string, contents: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number) {
  const string = String(value);
  return `"${(/^[=+\-@\t\r]/.test(string) ? `'${string}` : string).replaceAll('"', '""')}"`;
}
