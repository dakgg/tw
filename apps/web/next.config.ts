import type { NextConfig } from 'next';

try {
  process.loadEnvFile('../../.env');
} catch {
  // 환경 파일이 없어도 데모 모드로 빌드됩니다.
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
