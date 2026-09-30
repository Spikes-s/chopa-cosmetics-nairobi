import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const getVisitorId = (): string => {
  const key = 'chopa_visitor_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
};

// A session ends after 30 minutes of inactivity.
const SESSION_TIMEOUT = 30 * 60 * 1000;
const getSessionId = (): string => {
  const key = 'chopa_session';
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    const now = Date.now();
    if (parsed?.id && now - parsed.at < SESSION_TIMEOUT) {
      localStorage.setItem(key, JSON.stringify({ id: parsed.id, at: now }));
      return parsed.id;
    }
    const id = crypto.randomUUID();
    localStorage.setItem(key, JSON.stringify({ id, at: now }));
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

const HEARTBEAT_MS = 15000;

export const usePageVisit = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    const visitId = crypto.randomUUID();
    const visitorId = getVisitorId();
    let timer: ReturnType<typeof setInterval> | undefined;

    const touch = () => {
      if (document.visibilityState !== 'visible') return;
      getSessionId(); // keep the session alive
      supabase.rpc('touch_page_visit', { _id: visitId, _visitor_id: visitorId }).then(() => {});
    };

    supabase
      .from('page_visits')
      .insert({
        id: visitId,
        page_path: location.pathname,
        visitor_id: visitorId,
        session_id: getSessionId(),
        user_agent: navigator.userAgent.substring(0, 500),
        referrer: document.referrer?.substring(0, 500) || null,
      })
      .then(({ error }) => {
        if (!error) timer = setInterval(touch, HEARTBEAT_MS);
      });

    return () => {
      if (timer) clearInterval(timer);
      touch();
    };
  }, [location.pathname]);
};
