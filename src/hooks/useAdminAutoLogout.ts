import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const useAdminAutoLogout = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(async () => {
    if (user && isAdmin) {
      toast.warning('Session expired due to inactivity');
      await signOut();
      navigate('/admin/login');
    }
  }, [user, isAdmin, signOut, navigate]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user && isAdmin) {
      timeoutRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    }
  }, [user, isAdmin, handleLogout]);

  useEffect(() => {
    if (!user || !isAdmin) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    
    // Throttle to avoid excessive timer resets
    let lastReset = Date.now();
    const throttledReset = () => {
      if (Date.now() - lastReset > 60000) { // Only reset every 60s
        lastReset = Date.now();
        resetTimer();
      }
    };

    events.forEach(e => window.addEventListener(e, throttledReset, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, throttledReset));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, isAdmin, resetTimer]);
};

export default useAdminAutoLogout;
