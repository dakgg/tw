# Stay Signal

한국 숙박업 운영자가 주변 익명 시세, 방한 수요, 해외 공휴일을 바탕으로 판매가 변화를 판단하는 MVP입니다.

## 구성

- `apps/web`: Next.js, Apache ECharts
- `apps/api`: NestJS, BullMQ 수집 큐
- `prisma`: PostgreSQL/PostGIS 데이터 모델과 초기 마이그레이션

외부 공급자 API 키가 없어도 서울 중구·부산 해운대구·제주시 데모 데이터로 전체 화면과 API가 동작합니다.

## 실행

```bash
cp .env.example .env
npm install
npm run dev
```

- 웹: http://localhost:3000
- API: http://localhost:4000/api
- API 문서: http://localhost:4000/docs

웹은 기본적으로 동일 출처 `/api`를 NestJS `:4000`으로 프록시하므로 Cloudflare Quick Tunnel처럼 웹 포트 하나만 공개해도 동작합니다.

PostgreSQL과 Redis를 함께 실행하려면:

```bash
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
psql "$DATABASE_URL" -f prisma/postgis.sql
```

## 주요 API

- `GET /api/operating-areas`
- `GET /api/dashboard/:areaCode?radiusKm=3&countryCodes=JP,CN,TW,US`
- `GET /api/holidays?countryCodes=JP,CN,TW,US&year=2026`
- `GET /api/inbound-demand?areaCode=SEOUL-JG`
- `GET /api/country-booking-rates?areaCode=SEOUL-JG`
- `GET /api/market-rates?areaCode=SEOUL-JG&radiusKm=3`
- `POST /api/collectors/run`

실서비스에서는 항공/GDS와 숙박 시세 공급자 어댑터를 추가하면 됩니다. 공휴일은 국가별 공식 공휴일 데이터셋을 연도 단위로 제공합니다. 개별 숙소 정보는 저장·노출하지 않고 지역·반경·객실 유형별 익명 집계값만 유지합니다. 항공사 실판매 데이터가 연결되기 전 국가별 예매율은 검색량·예약 신호·좌석 공급을 결합한 추정치로 표시합니다.
