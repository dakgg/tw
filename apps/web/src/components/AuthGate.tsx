'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { PublicUser } from '@/lib/types';
import { ApiError, authRequest } from '@/lib/auth';
import { EhConsole } from './EhConsole';
import { Icon } from './eh/Ui';

export function AuthGate() {
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [signupAllowed, setSignupAllowed] = useState(false);
  useEffect(() => {
    let live = true;
    void authRequest('/me').then((result) => { if (live) setUser(result.user); }).catch((cause) => {
      if (!live) return;
      setUser(null);
      if (!(cause instanceof ApiError && cause.status === 401)) setNotice('서버에 연결할 수 없습니다. API 실행 상태를 확인해 주세요.');
    });
    void authRequest<{ signupAllowed: boolean }>('/config').then((result) => { if (live) setSignupAllowed(result.signupAllowed); }).catch(() => {});
    const expired = () => { setUser(null); setNotice('로그인이 만료되었습니다. 다시 로그인해 주세요.'); };
    window.addEventListener('eh:unauthorized', expired);
    return () => { live = false; window.removeEventListener('eh:unauthorized', expired); };
  }, []);
  if (user === undefined) return <div className="auth-loading"><span className="auth-wordmark"><b>EH</b><i>.</i></span><span className="spinner" /><p>로그인 상태를 확인하고 있습니다.</p></div>;
  if (user) return <EhConsole user={user} onLogout={async () => { await authRequest('/logout', {}); setUser(null); setNotice('안전하게 로그아웃했습니다.'); }} />;
  return <Login signupAllowed={signupAllowed} notice={notice} onLogin={(account) => { setUser(account); setNotice(''); }} />;
}

function Login({ onLogin, notice, signupAllowed }: { onLogin: (user: PublicUser) => void; notice: string; signupAllowed: boolean }) {
  const [register, setRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password'));
    if (register && password !== form.get('confirmPassword')) { setError('비밀번호 확인이 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try {
      const result = await authRequest(register ? '/register' : '/login', { username: form.get('username'), password, ...(register ? { displayName: form.get('displayName'), demo: form.get('demo') === 'on' } : {}) });
      onLogin(result.user);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '로그인에 실패했습니다.'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page">
    <section className="auth-story" aria-label="EH 소개"><a href="/" className="auth-wordmark"><b>EH</b><i>.</i></a><div className="auth-story-body"><p className="auth-eyebrow">EVERY STAY. ONE WORKSPACE.</p><h1>숙박 운영의 모든 순간,<br />하나로 연결되다.</h1><p className="auth-story-copy">예약부터 객실 정비, 게스트 응대와 정산까지.<br />나만의 운영 공간에서 더 가볍게 시작하세요.</p><div className="auth-illustration" aria-hidden="true"><div className="illustration-heading"><span className="illustration-logo">EH</span><span>YOUR OPERATIONS, TOGETHER</span><i /></div><div className="illustration-cards"><div><Icon name="calendar" size={23} /><span>예약 관리</span><b>한눈에</b></div><div><Icon name="home" size={23} /><span>객실 운영</span><b>빈틈없이</b></div><div><Icon name="chart" size={23} /><span>매출·정산</span><b>명확하게</b></div></div><div className="illustration-flow"><span><Icon name="link" size={15} /> 나의 예약 채널</span><i /><span className="flow-center">EH</span><i /><span><Icon name="check" size={15} /> 나의 워크스페이스</span></div></div><div className="auth-features"><span><Icon name="check" size={15} />계정별 독립 공간</span><span><Icon name="check" size={15} />예약과 운영 통합 관리</span></div></div><p className="auth-story-footer">Designed for better stays.</p></section>
    <section className="auth-form-section"><span className="auth-mobile-brand auth-wordmark"><b>EH</b><i>.</i></span><div className="auth-form-wrap"><p className="eyebrow">WELCOME TO EH</p><h2>{register ? '나의 운영 공간 만들기' : '반가워요, 다시 오셨네요.'}</h2><p className="auth-subtitle">{register ? '아이디와 비밀번호를 만들고 숙소 운영을 시작하세요.' : '아이디와 비밀번호를 확인한 뒤 워크스페이스로 이동합니다.'}</p>
      {signupAllowed && <div className="auth-tabs"><button type="button" disabled={busy} className={!register ? 'active' : ''} onClick={() => { setRegister(false); setError(''); }}>로그인</button><button type="button" disabled={busy} className={register ? 'active' : ''} onClick={() => { setRegister(true); setError(''); }}>계정 만들기</button></div>}
      {notice && <p className="auth-notice" role="status">{notice}</p>}
      <form key={String(register)} onSubmit={submit} className="auth-form">
        {register && <label>이름<input name="displayName" autoComplete="name" required maxLength={60} placeholder="운영자 이름" disabled={busy} /></label>}
        <label>아이디<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,39}" placeholder={register ? '영문·숫자 3~40자' : '아이디를 입력하세요'} disabled={busy} /></label>
        <label>비밀번호<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 10 : 1} maxLength={128} placeholder={register ? '10자 이상으로 입력하세요' : '비밀번호를 입력하세요'} disabled={busy} /><button type="button" aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? '숨기기' : '보기'}</button></span></label>
        {register && <><label>비밀번호 확인<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={10} maxLength={128} placeholder="비밀번호를 한 번 더 입력하세요" disabled={busy} /></label><label className="auth-demo"><input type="checkbox" name="demo" disabled={busy} /><span>예시 데이터를 넣어 기능 살펴보기<small>가상의 숙소·예약으로 시작합니다. 실제 OTA 정보가 아닙니다.</small></span></label></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="auth-submit" disabled={busy}>{busy ? '확인 중…' : register ? '계정 만들고 시작하기' : '로그인'}<Icon name="arrow" size={18} /></button>
      </form><div className="auth-privacy"><Icon name="users" size={16} /><p>숙소·예약·OTA 연결 정보는<br />로그인한 사용자별로 분리됩니다.</p></div>
    </div><footer className="auth-footer">EH · 숙박 운영 워크스페이스</footer></section>
  </main>;
}
