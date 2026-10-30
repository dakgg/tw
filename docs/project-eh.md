# EH 구현 범위

2026-10-30 기준. Zest는 타 업체의 제품명이며 기능 참고자료로만 사용합니다. 현재 프로젝트의 가제는 EH입니다.

## 사용자 흐름

로그인 화면 → 회원가입 또는 ID/PW 검증 → 내 워크스페이스 → 숙소·객실 등록 → 예약·재고·청소·게스트·정산 관리 → 숙소별 OTA 연결 설정.

새 계정은 기본적으로 비어 있습니다. 가입 시 예시 데이터 옵션을 선택한 계정에만 가상 숙소와 예약을 넣습니다. 기존 사용자 데이터 파일은 새 계정에 자동 이관하지 않습니다.

## 계정 경계

브라우저에는 세션 쿠키만 보관합니다. 인증 가드는 모든 운영 API에서 계정을 확인하고, 서버가 그 사용자에 해당하는 저장소를 선택합니다. 외부 입력으로 사용자 ID를 지정해 다른 저장소를 고를 수 없습니다. 동일한 숙소·예약 ID를 사용하더라도 다른 사용자의 파일에는 접근할 수 없습니다.

세션 토큰과 비밀번호는 평문으로 저장하지 않습니다. 비밀번호는 사용자별 salt + scrypt, 세션은 SHA-256 토큰 해시로 저장합니다. 세션은 12시간 유효하며 계정별 최대 5개입니다. 비밀번호 변경 시 기존 세션은 모두 폐기하고 현재 요청에 새 세션을 발급합니다.

직원·청소업체용 역할은 미구현입니다. 한 계정이 자신의 모든 숙소를 관리하는 구조입니다.

## 주요 API

| 메서드 | 경로 | 기능 |
| --- | --- | --- |
| GET | `/api/auth/config` | 가입 허용 여부 |
| POST | `/api/auth/register` | 계정 생성 및 세션 발급 |
| POST | `/api/auth/login` | ID/PW 검증 및 세션 발급 |
| GET | `/api/auth/me` | 현재 로그인 계정 |
| POST | `/api/auth/logout` | 현재 세션 폐기 |
| POST | `/api/auth/password` | 현재 비밀번호 검증 후 변경·세션 교체 |
| GET | `/api/console` | 로그인 사용자의 운영 데이터 |
| GET | `/api/console/inventory` | 숙소·시작일·일수별 객실 재고 |
| POST / PATCH | `/api/console/properties[/id]` | 내 숙소 등록·수정 |
| POST / PATCH | `/api/console/rooms[/id]` | 내 객실 등록·수정 |
| POST / PATCH | `/api/console/reservations[/id]` | 예약 등록·수정 |
| PATCH | `/api/console/reservations/:id/status` | 체크인·체크아웃·취소 |
| PATCH | `/api/console/reservations/:id/settlement` | 수동 정산 확인 |
| POST | `/api/console/rates` | 기간별 요금·판매 중지 |
| POST / PATCH | `/api/console/cleaning[/id]` | 청소 일정·담당자·상태 |
| POST / PATCH | `/api/console/issues[/id]` | 객실 이슈 |
| PATCH | `/api/console/guests/:id/note` | 게스트 노트 |
| POST | `/api/console/messages/drafts` | 답장 초안 저장 |
| PATCH | `/api/console/messages/:reservationId/read` | 대화 읽음 표시 |
| POST / PATCH | `/api/console/claims[/id]` | 보상 자료 |
| POST | `/api/console/claims/:id/evidence` | 보상 증빙 사진 |
| PATCH | `/api/console/connections/:id` | 내 OTA 식별 정보 저장 |
| POST | `/api/console/connections/:id/sync` | 실제 어댑터 없음: 명시적 503 |

모든 `/api/console/*`와 `auth/me`, `auth/password`는 인증이 필요합니다. 등록·변경 요청은 다른 웹 출처에서 호출할 수 없습니다.

## 후속 연동

사용자가 공식 파트너 API가 없음을 확인하여 실제 외부 연결은 범위에서 제외했습니다. 연결 설정은 사용자별로 저장되지만 비밀번호·API 키 저장이나 OAuth 흉내를 제공하지 않습니다. 파트너 선정 후 실제 승인 절차·안전한 토큰 저장·객실 매핑·동기화를 추가합니다.

PostgreSQL 스키마는 설계만 교체했습니다. 현재 파일 저장소를 다중 프로세스에서 운영하거나 기존 데이터베이스에 새 스키마를 바로 적용하지 않습니다.
