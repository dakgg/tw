import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stay Signal',
  description: '주변 익명 시세와 방한 수요를 한눈에',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
