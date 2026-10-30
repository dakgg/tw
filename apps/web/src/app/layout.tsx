import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EH · 숙박 운영 콘솔',
  description: '예약부터 객실 재고, 청소, 게스트 응대와 정산까지 한곳에서 관리하는 숙박 운영 콘솔',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
