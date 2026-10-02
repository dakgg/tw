# Stay Signal

한국 숙박업 운영자가 주요 방한 시장의 공휴일 일정을 확인하는 MVP입니다.

## 현재 기능

- `date-holidays` 기반 일본·중국·대만·미국의 연도별 공휴일 및 월간 달력
- 일본·중국·대만·미국 통화의 원화 기준 환율과 데이터 출처
- 모바일 반응형 대시보드와 Swagger API 문서
- Google 지도에서 국내 숙소명·주소 검색, 위치 선택 및 반경 1km 표시 (실제 가격 연동은 대기 중)

생성 데이터나 로컬 대체값은 사용하지 않습니다. 실제 공급자가 연결되기 전까지 항공 수요, 예매율, 숙박 시세와 가격 추천은 빈 결과를 반환하며 화면에도 표시하지 않습니다. 공휴일은 `date-holidays` 데이터셋을 사용합니다.

## 기술 구성

```text
apps/web   Next.js + TypeScript + Apache ECharts
apps/api   NestJS + BullMQ
prisma     PostgreSQL + PostGIS 데이터 모델
infra      Redis + Docker Compose
```

웹의 `/api/*` 요청은 NestJS `:4000`으로 프록시됩니다. 따라서 외부 공유 시 웹 포트 `3000` 하나만 공개하면 됩니다.

## 로컬 실행

Node.js 20 이상과 npm이 필요합니다.

```bash
cp .env.example .env
npm install
npm run dev
```

- 대시보드: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/docs

검증 명령:

```bash
npm run lint
npm test
npm run build
npm run prisma:generate
```

## 데이터베이스와 수집 큐

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
psql "$DATABASE_URL" -f prisma/postgis.sql
```

`REDIS_URL`이 없으면 수집 큐는 비활성화됩니다. 설정하면 수집 작업이 BullMQ에 6시간 주기로 등록되지만, 실제 공급자 어댑터를 연결하기 전에는 작업이 실패합니다.

## Google 지도 설정

Google Cloud 프로젝트에서 결제 계정을 연결하고 **Maps JavaScript API**와 **Places API (New)**를 활성화하세요. `apps/web/.env.local`에 아래 변수를 설정한 다음 개발 서버를 재시작합니다. 배포 환경에서는 빌드 전에 설정해야 합니다.

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=발급받은_브라우저용_키
```

브라우저에 공개되는 키이므로 Google Cloud에서 웹사이트 HTTP 리퍼러 제한(`http://localhost:3000/*`, 실제 배포 도메인)과 위 API 제한을 설정하세요. 키 파일은 커밋하지 않습니다. 키가 없으면 지도 연결 안내를 표시합니다. 검색 범위는 대한민국이며 검색된 이름·주소·위치와 1km 원을 표시합니다. Google 지도 연동은 예약 사이트 가격 조회와 별개입니다.

[Google 공식 설정 안내](https://developers.google.com/maps/documentation/javascript/get-api-key) · [장소 자동완성 안내](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)

## Cloudflare Quick Tunnel

macOS에서는 다음과 같이 임시 공개 주소를 만들 수 있습니다.

```bash
brew install cloudflared
npm run dev
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:3000
```

출력된 `https://*.trycloudflare.com` 주소를 공유합니다. Quick Tunnel은 테스트 전용이며 프로세스를 종료하거나 다시 실행하면 주소가 변경됩니다.

## 주요 API

- `GET /api/operating-areas`
- `GET /api/dashboard/:areaCode?radiusKm=3&countryCodes=JP,CN,TW,US`
- `GET /api/holidays?countryCodes=JP,CN,TW,US&year=2026`
- `GET /api/exchange-rates`
- `GET /api/inbound-demand?areaCode=SEOUL-JG`
- `GET /api/country-booking-rates?areaCode=SEOUL-JG`
- `GET /api/market-rates?areaCode=SEOUL-JG&radiusKm=3`
- `POST /api/collectors/run`

## 실제 데이터 연동 계획

국내 숙소 가격의 사이트별 연동 조건과 비교 기준은 [숙소 가격 연동 문서](./docs/accommodation-providers.md)를 참고하세요.

- Booking.com: Demand API 파트너 자격증명 필요
- Trip.com: Hotel API 파트너 자격증명 필요
- Google Maps: Maps JavaScript API 키와 결제 계정 필요
- Airbnb: 가격 분석 사용을 허용하는 별도 파트너 계약 없이는 연동하지 않음

개별 숙소 정보는 장기 저장하지 않고 지역·반경·객실 유형별 익명 집계값만 유지하는 것을 원칙으로 합니다. API 키는 저장소에 커밋하지 말고 `.env`에만 보관하세요.

## 문서

- [저장소 기여 지침](./AGENTS.md)
- [날짜별 작업일지](./docs/work-log/README.md)
