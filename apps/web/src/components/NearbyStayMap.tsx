'use client';

import { useEffect, useRef, useState } from 'react';

type Location = { lat: number; lng: number; name?: string; address?: string };
const koreaBounds = { south: 32.5, west: 124, north: 39, east: 132 };
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function NearbyStayMap() {
  const container = useRef<HTMLDivElement>(null);
  const searchContainer = useRef<HTMLDivElement>(null);
  const selectLocation = useRef<((location: Location) => void) | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    let disposed = false;
    let selectionVersion = 0;
    let instance: google.maps.Map | undefined;
    let radius: google.maps.Circle | undefined;
    let center: google.maps.Circle | undefined;
    let autocomplete: google.maps.places.PlaceAutocompleteElement | undefined;
    let clickListener: google.maps.MapsEventListener | undefined;
    const timeout = window.setTimeout(() => {
      if (!disposed) setError('Google 지도를 불러오지 못했습니다. 연결과 지도 서비스 설정을 확인한 뒤 새로고침해 주세요.');
    }, 15000);
    const choosePlace = async (event: Event) => {
      const version = ++selectionVersion;
      try {
        const place = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction.toPlace();
        await place.fetchFields({ fields: ['location', 'displayName', 'formattedAddress'] });
        if (disposed || version !== selectionVersion) return;
        if (!place.location) throw new Error('Missing location');
        selectLocation.current?.({ ...place.location.toJSON(), name: place.displayName ?? undefined, address: place.formattedAddress ?? undefined });
      } catch {
        if (!disposed && version === selectionVersion) setError('선택한 장소의 위치를 불러오지 못했습니다. 다시 검색하거나 지도에서 선택하세요.');
      }
    };
    const searchError = () => setError('장소 검색을 사용할 수 없습니다. Google Places 서비스 설정을 확인하세요.');
    void (async () => {
      const { setOptions, importLibrary } = await import('@googlemaps/js-api-loader');
      setOptions({ key: apiKey, v: 'weekly', language: 'ko', region: 'KR' });
      const [{ Map, Circle }, { PlaceAutocompleteElement }] = await Promise.all([importLibrary('maps'), importLibrary('places')]);
      if (disposed || !container.current || !searchContainer.current) return;
      instance = new Map(container.current, {
        center: { lat: 36.3, lng: 127.8 }, zoom: 7,
        restriction: { latLngBounds: koreaBounds, strictBounds: false },
        streetViewControl: false, mapTypeControl: false, gestureHandling: 'cooperative',
      });
      radius = new Circle({ map: instance, radius: 1000, strokeColor: '#18794e', strokeWeight: 2, fillColor: '#18794e', fillOpacity: 0.1, clickable: false });
      center = new Circle({ map: instance, radius: 15, strokeColor: '#ffffff', strokeWeight: 2, fillColor: '#18794e', fillOpacity: 1, clickable: false });
      selectLocation.current = (point) => {
        if (point.lat < koreaBounds.south || point.lat > koreaBounds.north || point.lng < koreaBounds.west || point.lng > koreaBounds.east) {
          setError('한국 지도 범위 안에서 숙소 위치를 선택하세요.');
          return;
        }
        ++selectionVersion;
        radius?.setCenter(point);
        center?.setCenter(point);
        const bounds = radius?.getBounds();
        if (bounds) instance?.fitBounds(bounds, 30);
        setLocation(point);
        setLatitude(point.lat.toFixed(6));
        setLongitude(point.lng.toFixed(6));
        setError('');
      };
      clickListener = instance.addListener('click', (event: google.maps.MapMouseEvent) => {
        event.stop();
        if (event.latLng) selectLocation.current?.(event.latLng.toJSON());
      });
      autocomplete = new PlaceAutocompleteElement({ includedRegionCodes: ['kr'] });
      autocomplete.setAttribute('placeholder', '숙소명 또는 주소 검색');
      autocomplete.setAttribute('aria-label', '국내 숙소명 또는 주소 검색');
      autocomplete.addEventListener('gmp-select', choosePlace);
      autocomplete.addEventListener('gmp-error', searchError);
      searchContainer.current.appendChild(autocomplete);
      window.clearTimeout(timeout);
      setError('');
      setReady(true);
    })().catch(() => {
      window.clearTimeout(timeout);
      if (!disposed) setError('Google 지도를 불러오지 못했습니다. 연결과 지도 서비스 설정을 확인한 뒤 새로고침해 주세요.');
    });
    return () => {
      disposed = true;
      ++selectionVersion;
      window.clearTimeout(timeout);
      clickListener?.remove();
      autocomplete?.removeEventListener('gmp-select', choosePlace);
      autocomplete?.removeEventListener('gmp-error', searchError);
      autocomplete?.remove();
      radius?.setMap(null);
      center?.setMap(null);
      if (instance) google.maps.event.clearInstanceListeners(instance);
      selectLocation.current = null;
    };
  }, []);

  return (
    <section className="panel nearby-panel" aria-labelledby="nearby-title">
      <div className="panel-title"><div><p>NEARBY STAYS · KOREA</p><h2 id="nearby-title">내 숙소 주변 1km</h2></div><small>Google 지도 · 국내 숙소</small></div>
      <p className="nearby-description">숙소명이나 주소를 검색하거나 지도에서 위치를 클릭하세요. 초록색 원은 직선거리 반경 1km입니다.</p>
      {!apiKey && <div className="nearby-unavailable"><strong>Google 지도 연결이 필요합니다.</strong><p>지도 서비스 설정이 완료되면 숙소명·주소 검색과 위치 선택을 이용할 수 있습니다.</p></div>}
      {apiKey && !ready && !error && <p role="status">Google 지도 불러오는 중…</p>}
      <div ref={searchContainer} className="place-search" />
      <div ref={container} className="nearby-map" hidden={!apiKey} aria-label="Google 지도에서 국내 숙소 위치 선택" />
      {apiKey && <form className="location-form" onSubmit={(event) => {
        event.preventDefault();
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          setError('올바른 위도와 경도를 입력하세요.');
          return;
        }
        selectLocation.current?.({ lat, lng });
      }}>
        <label>위도<input type="number" step="any" min="32.5" max="39" required value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label>
        <label>경도<input type="number" step="any" min="124" max="132" required value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label>
        <button type="submit" disabled={!ready}>좌표로 위치 선택</button>
      </form>}
      {error && <p role="alert">{error}</p>}
      <div className="nearby-description" aria-live="polite">
        {location ? <><strong>{location.name || '선택한 숙소 위치'}</strong>{location.address && <p>{location.address}</p>}<p>{location.lat.toFixed(6)}, {location.lng.toFixed(6)} · 반경 1km</p></> : '아직 내 숙소 위치를 선택하지 않았습니다.'}
      </div>
      <div className="nearby-unavailable">
        <strong>주변 숙소 가격 · 데이터 연동 대기</strong>
        <p>야놀자·여기어때·아고다·부킹닷컴의 국내 숙소 가격은 아직 연결되지 않았습니다. 가격 조회를 이용하려면 데이터 제공 제휴가 필요합니다.</p>
        <small>현재 지도는 위치와 범위만 표시합니다. 주변 숙소가 없거나 매진이라는 뜻이 아닙니다.</small>
      </div>
    </section>
  );
}
