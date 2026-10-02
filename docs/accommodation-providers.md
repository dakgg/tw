# 국내 숙소 가격 연동

확인일: 2026-10-02. 대상은 한국 소재 숙소이며, 선택한 내 숙소에서 직선거리 1km 이내를 비교한다.

## 구현 상태

Google 지도에서 국내 숙소명·주소 검색, 지도 클릭 또는 좌표 입력으로 위치를 선택하고 1,000m 원을 표시한다. 선택 결과는 현재 화면 메모리에만 보관하며 장소 검색 요청은 Google로 전송한다. Google 지도와 Places API (New) 설정이 필요하다. 가격 수집기 및 가격 조회 API는 아직 구현하지 않았다. 연동 미완료를 빈 검색 결과나 매진으로 표시하지 않는다.

## 사이트별 조건

| 사이트 | 확인 결과 | 필요한 연동 조건 |
| --- | --- | --- |
| 야놀자(NOL) | 이용약관 제22조 제4항 제15호에 사전 서면 허가 없는 자동 데이터 추출 제한 | 국내 숙소 가격 조회·경쟁 시세 분석에 대한 제공사 허가 및 명세 |
| 여기어때 | 이용약관 제22조 제18호에 사전 서면 승낙 없는 데이터 추출 제한 | 제공사 허가 및 데이터 연동 계약·명세 |
| 아고다 | 이용약관 1.3.4~1.3.5에 수집 제한. 공식 Search API 존재 | 사용 목적을 허용하는 제휴 계약, siteid 및 API key |
| 부킹닷컴 | 이용약관 A15.2에 사전 서면 허가 없는 자동 수집 제한. Demand API 존재 | 사용 목적을 허용하는 제휴 계약 및 API 자격증명 |

공식 API의 존재가 경쟁 숙소 분석·저장·재배포까지 허용한다는 뜻은 아니다. 계약 범위와 한국 숙소 제공 범위를 확인한 뒤 어댑터를 구현한다. 숙소 운영 계정만으로 다른 숙소의 가격 조회 권한을 가정하지 않는다.

## 비교 기준

- 체크인·체크아웃은 한국 시간(Asia/Seoul)의 숙박 날짜로 처리한다.
- 통화는 KRW. 인원·객실 수·객실 유형·취소 조건이 다른 상품을 같은 가격으로 비교하지 않는다.
- 국내 모텔의 대실과 숙박을 분리하고, 기본 비교는 숙박으로 한다.
- 총액, 1박 평균, 세금·수수료 포함 여부, 공개가/회원가/쿠폰가를 구분한다.
- 각 가격에 사이트 출처, 원문 링크, 조회 시각을 붙인다. 미조회·오류·매진을 구분한다.
- 제공사 좌표로 1,000m 거리를 검증한다. 지도 범위 사각형은 국경 판정이나 숙소 검색 결과가 아니다.

## 공식 자료

- [NOL 이용약관](https://nol.yanolja.com/policy/service)
- [여기어때 이용약관](https://www.yeogi.com/term_project/contents/terms/terms-2026-06-01.html)
- [아고다 이용약관](https://www.agoda.com/info/termsofuse.html), [Search API](https://developer.agoda.com/demand/docs/json-search-api)
- [부킹닷컴 이용약관](https://www.booking.com/content/terms.en-gb.html), [Demand API 준비 사항](https://developers.booking.com/demand/docs/getting-started/prerequisites)
- [Google 지도 설정](https://developers.google.com/maps/documentation/javascript/get-api-key), [장소 자동완성](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
