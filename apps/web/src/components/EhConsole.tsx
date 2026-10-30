'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleSnapshot, PublicUser } from '@/lib/types';
import { dayLabel, request } from '@/lib/console';
import { Empty, Icon } from './eh/Ui';
import { Overview } from './eh/Overview';
import { Reservations } from './eh/Reservations';
import { Rates } from './eh/Rates';
import { Cleaning, Issues } from './eh/Operations';
import { Guests, Messages } from './eh/GuestCare';
import { Reports } from './eh/Reports';
import { Claims } from './eh/Claims';
import { Channels, Settings } from './eh/Settings';
import { sections, type Section, WorkspaceContext } from './eh/Workspace';

const screens = { overview: Overview, reservations: Reservations, rates: Rates, cleaning: Cleaning, messages: Messages, issues: Issues, reports: Reports, guests: Guests, claims: Claims, channels: Channels, settings: Settings };

export function EhConsole({ user, onLogout }: { user: PublicUser; onLogout: () => Promise<void> }) {
  const [section, setSection] = useState<Section>('overview');
  const [data, setData] = useState<ConsoleSnapshot | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const saving = useRef(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++sequence.current;
    setRefreshing(true);
    try {
      const snapshot = await request<ConsoleSnapshot>('', undefined, 'GET', user.id);
      if (version === sequence.current) { setData(snapshot); setPropertyId((current) => snapshot.properties.some((property) => property.id === current) ? current : snapshot.properties[0]?.id ?? ''); setError(''); }
    } catch (cause) { if (version === sequence.current) setError(cause instanceof Error ? cause.message : '콘솔을 불러오지 못했습니다.'); }
    finally { if (version === sequence.current) setRefreshing(false); }
  }, [user.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const update = () => { const id = window.location.hash.slice(1); if (sections.some((item) => item.id === id)) setSection(id as Section); };
    update(); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    if (!mobileMenu) return;
    sidebar.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]')?.focus();
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileMenu(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mobileMenu]);
  function navigate(id: Section) { window.location.hash = id; setSection(id); setMobileMenu(false); }
  async function mutate(path: string, body: unknown, method = 'POST', message = '저장했습니다.') {
    if (saving.current) throw new Error('다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.');
    saving.current = true; setBusy(true); ++sequence.current; setRefreshing(false);
    try {
      const snapshot = await request<ConsoleSnapshot>(path, body, method, user.id);
      setData(snapshot); setError('');
      if (path === '/properties' && method === 'POST') setPropertyId(snapshot.properties[snapshot.properties.length - 1].id);
      setToast({ text: message });
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : '저장에 실패했습니다.';
      setToast({ text, error: true }); throw cause;
    } finally { saving.current = false; setBusy(false); }
  }
  async function logout() {
    if (saving.current) return;
    saving.current = true; setBusy(true);
    try { await onLogout(); }
    catch (cause) { setToast({ text: cause instanceof Error ? cause.message : '로그아웃하지 못했습니다.', error: true }); }
    finally { saving.current = false; setBusy(false); }
  }
  const current = sections.find((item) => item.id === section)!;
  const unread = data?.messages.filter((item) => item.propertyId === propertyId && !item.read).length ?? 0;
  const Screen = screens[section];
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">본문으로 이동</a>
    {mobileMenu && <button className="sidebar-backdrop" aria-label="메뉴 닫기" onClick={() => setMobileMenu(false)} />}
    <aside id="main-navigation" ref={sidebar} className={`sidebar ${mobileMenu ? 'open' : ''}`}><a className="brand" href="#overview" onClick={() => navigate('overview')}><span className="eh-brand-mark">EH</span><span className="eh-brand-name">EH<span className="brand-period">.</span></span></a>
      <div className="workspace-label"><span className="workspace-monogram">EH</span><div><strong>숙박 운영 워크스페이스</strong><small>{data?.mode === 'demo' ? '체험 모드' : '개인 워크스페이스'}</small></div></div>
      <button className="icon-button mobile-menu-close" aria-label="메뉴 닫기" onClick={() => { setMobileMenu(false); menuButton.current?.focus(); }}><Icon name="close" /></button><nav aria-label="주요 메뉴"><p className="nav-caption">WORKSPACE</p>{sections.map((item, index) => <div key={item.id}>{index === 9 && <p className="nav-caption management">MANAGEMENT</p>}<a href={`#${item.id}`} className={`nav-item ${section === item.id ? 'active' : ''}`} aria-current={section === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={19} /><span>{item.name}</span>{item.id === 'messages' && unread > 0 && <b>{unread}</b>}</a></div>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-note"><span className="status-dot" /><div><strong>한곳에서, 더 가볍게.</strong><small>예약부터 운영까지 EH</small></div></div><div className="operator"><span className="avatar">{user.displayName.slice(0, 1)}</span><div><strong>{user.displayName}</strong><small>@{user.username}</small></div></div></div>
    </aside>
    <div className="main-shell" inert={mobileMenu}><header className="topbar"><div className="breadcrumb"><button ref={menuButton} className="icon-button mobile-menu-button" aria-label="메뉴 열기" aria-controls="main-navigation" aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)}><Icon name="grid" /></button><Icon name="home" size={17} /><span>/</span><strong>{current.name}</strong></div><div className="topbar-actions"><label className="property-select"><Icon name="home" size={17} /><select aria-label="운영 숙소 선택" value={propertyId} disabled={busy} onChange={(event) => setPropertyId(event.target.value)}>{!data?.properties.length && <option value="">숙소 등록 필요</option>}{data?.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><button className="notification-button icon-button" aria-label={`읽지 않은 메시지 ${unread}건`} onClick={() => navigate('messages')}><Icon name="bell" />{unread > 0 && <i />}</button><button className="logout-button" disabled={busy} onClick={() => void logout()}>로그아웃</button></div></header>
      <main id="main-content"><div className="page-heading"><div><p className="eyebrow">YOUR STAY, IN SYNC.</p><h1>{current.name}</h1><p>{current.description}</p></div><div className="heading-actions">{data && <span className="date-label"><Icon name="calendar" size={16} />{dayLabel(data.today)}</span>}<button className="button" disabled={refreshing || busy} onClick={() => void refresh()}>{refreshing ? '불러오는 중…' : '새로고침'}</button></div></div>
        {data && <div className="workspace-banner"><span><span className="status-dot" />{data.mode === 'demo' ? '체험 워크스페이스 · 예시 데이터' : `${user.displayName}님의 워크스페이스`}</span><span>변경 내용은 저장됩니다 · 외부 채널 미연결</span></div>}
        {error && <div className="error-banner" role="alert"><strong>콘솔 연결을 확인해 주세요.</strong><p>{error}</p><button className="button" onClick={() => void refresh()}>다시 시도</button></div>}
        {data ? <WorkspaceContext.Provider value={{ data, propertyId, mutate, busy, navigate, user }}><div className="screen" key={`${propertyId}-${section}`}>{!propertyId && section !== 'settings' ? <Empty title="첫 숙소를 등록해 주세요." description="숙소와 객실을 설정하면 EH 운영을 시작할 수 있습니다." action={<button className="button primary" onClick={() => navigate('settings')}>숙소 설정하기</button>} /> : <Screen />}</div></WorkspaceContext.Provider> : !error && <div className="loading-state" role="status"><span className="spinner" /><p>워크스페이스를 불러오고 있습니다.</p></div>}
        <footer className="footer"><span>EH</span><span>숙박 운영의 모든 순간을 연결합니다.</span><small>© {data?.today.slice(0, 4) ?? '2026'} EH</small></footer>
      </main>
    </div>
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}><Icon name={toast.error ? 'close' : 'check'} size={19} /><span>{toast.text}</span><button className="icon-button" aria-label="알림 닫기" onClick={() => setToast(null)}><Icon name="close" size={16} /></button></div>}
  </div>;
}
