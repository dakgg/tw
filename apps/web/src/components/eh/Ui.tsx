'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { channelNames, statusNames } from '@/lib/console';
import type { Channel } from '@/lib/types';

const paths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18m-13 4h3m3 0h3" /></>,
  home: <><path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8" /></>,
  clean: <><path d="m15 3-5 10m-4-1 9 4-3 6-10-5 4-5Zm11-2 2-3m0 9 3-1" /></>,
  message: <path d="M21 11a8 8 0 0 1-8 8H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  tool: <path d="M14 5a5 5 0 0 0-6 6l-5 5a3 3 0 0 0 4 4l5-5a5 5 0 0 0 7-6l-4 3-3-3 3-4Z" />,
  chart: <><path d="M3 3v18h18M7 16v-4m5 4V7m5 9v-6" /></>,
  users: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-17a4 4 0 0 1 0 8m2 3a5 5 0 0 1 3 5" /></>,
  file: <><path d="M14 2H5v20h14V7l-5-5v5h5M8 12h8m-8 4h5" /></>,
  link: <><path d="m9 15 6-6m-8 5-2 2a4 4 0 0 0 6 6l3-3m-4-9 3-3a4 4 0 1 1 6 6l-2 2" transform="translate(0 -2)" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m9 3-1 3-3 1-2 3 2 2-1 4 3 2h3l2 3 3-2 3-1 2-3-1-3 1-3-3-2-3-3-3 1Z" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  down: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  bell: <><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3m5 4h4" /></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>,
};
export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}
export function Badge({ status }: { status: keyof typeof statusNames }) { return <span className={`badge status-${status}`}>{statusNames[status]}</span>; }
export function ChannelBadge({ channel }: { channel: Channel }) { return <span className={`channel-label ${channel}`}><i />{channelNames[channel]}</span>; }
export function Empty({ title = '아직 등록된 항목이 없습니다.', description = '새 항목을 등록하면 이곳에서 확인할 수 있습니다.', action }: { title?: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><span><Icon name="file" size={27} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Panel({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>}{children}</section>;
}
export function Stat({ label, value, unit, hint, icon }: { label: string; value: string | number; unit?: string; hint: string; icon: string }) {
  return <article className="stat"><div className="stat-label">{label}<span><Icon name={icon} size={18} /></span></div><strong>{value}<small>{unit}</small></strong><p>{hint}</p></article>;
}
export function Search({ value, onChange, placeholder = '검색' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search"><Icon name="search" size={18} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
export function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span>{children}</label>;
}
export function Modal({ title, description, onClose, onSubmit, children, submitLabel = '저장', busy = false }: { title: string; description?: string; onClose: () => void; onSubmit: (data: FormData) => Promise<void>; children: ReactNode; submitLabel?: string; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError('');
    try { await onSubmit(new FormData(event.currentTarget)); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }
  return <dialog ref={ref} className="modal" aria-labelledby={id} onCancel={(event) => { if (saving) event.preventDefault(); else onClose(); }}>
    <form onSubmit={submit}>
      <div className="modal-heading"><div><p className="eyebrow">EH WORKSPACE</p><h2 id={id}>{title}</h2></div><button className="icon-button" type="button" aria-label="닫기" onClick={onClose} disabled={saving}><Icon name="close" /></button></div>
      {description && <p className="modal-description">{description}</p>}
      <div className="form-grid">{children}</div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button" disabled={saving} onClick={onClose}>취소</button><button className="button primary" disabled={saving || busy} type="submit">{saving ? '저장 중…' : submitLabel}</button></div>
    </form>
  </dialog>;
}
