import type { NextConfig } from 'next';

try {
  process.loadEnvFile('../../.env');
} catch {
  // 환경 파일이 없으면 기본 로컬 주소를 사용합니다.
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
