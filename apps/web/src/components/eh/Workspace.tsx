'use client';
import { createContext, useContext } from 'react';
import type { ConsoleSnapshot, PublicUser } from '@/lib/types';

export type Section = 'overview' | 'reservations' | 'rates' | 'cleaning' | 'messages' | 'issues' | 'reports' | 'guests' | 'claims' | 'channels' | 'settings';
export const sections: { id: Section; name: string; icon: string; description: string }[] = [
  { id: 'overview', name: '대시보드', icon: 'grid', description: '오늘의 예약부터 운영 현황까지, 한눈에 확인하세요.' },
  { id: 'reservations', name: '예약 현황', icon: 'calendar', description: '모든 채널의 예약과 투숙 일정을 한곳에서 관리하세요.' },
  { id: 'rates', name: '객단가·재고', icon: 'home', description: '객실별 요금과 판매 가능 여부를 날짜별로 관리하세요.' },
  { id: 'cleaning', name: '청소 일정', icon: 'clean', description: '체크아웃에 맞춰 준비되는 청소 일정과 담당자를 확인하세요.' },
  { id: 'messages', name: '게스트 메신저', icon: 'message', description: '예약별 대화를 확인하고 게스트에게 보낼 답장을 준비하세요.' },
  { id: 'issues', name: '객실 이슈', icon: 'tool', description: '작은 불편부터 긴급 수리까지, 객실의 모든 이슈를 관리하세요.' },
  { id: 'reports', name: '매출·리포트', icon: 'chart', description: '채널별 예약 매출과 수수료, 정산 현황을 확인하세요.' },
  { id: 'guests', name: '게스트 노트', icon: 'users', description: '다시 찾아온 게스트를 위한 취향과 요청 사항을 기록하세요.' },
  { id: 'claims', name: '보상 자료지원', icon: 'file', description: '파손 사진과 기록을 모아 보상 요청에 필요한 자료를 준비하세요.' },
  { id: 'channels', name: '채널 연결', icon: 'link', description: '운영 중인 예약 채널의 연결 정보를 관리하세요.' },
  { id: 'settings', name: '숙소 설정', icon: 'settings', description: '숙소 정보와 객실 구성, 기본 요금을 설정하세요.' },
];
export type Workspace = {
  data: ConsoleSnapshot; propertyId: string; busy: boolean; user: PublicUser;
  mutate: (path: string, body: unknown, method?: string, message?: string) => Promise<void>;
  navigate: (section: Section) => void;
};
export const WorkspaceContext = createContext<Workspace | null>(null);
export function useWorkspace() {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error('워크스페이스가 필요합니다.');
  const { data, propertyId } = workspace;
  return {
    ...workspace,
    property: data.properties.find((property) => property.id === propertyId),
    rooms: data.rooms.filter((room) => room.propertyId === propertyId),
    reservations: data.reservations.filter((reservation) => reservation.propertyId === propertyId),
    guests: data.guests.filter((guest) => guest.propertyId === propertyId),
  };
}
export const formText = (data: FormData, name: string) => String(data.get(name) ?? '');
export const formNumber = (data: FormData, name: string) => Number(data.get(name));
