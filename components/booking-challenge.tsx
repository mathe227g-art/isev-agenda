"use client";
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global { interface Window { turnstile?: Turnstile } }

export function BookingChallenge({ onToken }: { onToken: (token: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !key || !element.current || !window.turnstile) return;
    const api = window.turnstile;
    const id = api.render(element.current, { sitekey: key, action: 'booking', callback: onToken,
      'expired-callback': () => onToken(''), 'error-callback': () => { onToken(''); setFailed(true); } });
    return () => { api.remove(id); };
  }, [ready, key, onToken]);
  if (!key) return <p role="status">Agendamento online temporariamente indisponível. Entre em contato com a empresa.</p>;
  return <>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      onReady={() => setReady(true)} onError={() => setFailed(true)} />
    <div ref={element} />
    {failed && <p role="alert">Não foi possível verificar a segurança. Recarregue a página.</p>}
  </>;
}
