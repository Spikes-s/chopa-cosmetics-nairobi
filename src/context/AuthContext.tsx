import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminRole = async () => {
    try {
      const { error } = await supabase.functions.invoke('require-admin');
      return !error;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  };

  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const ACTIVITY_KEY = 'chopa_last_activity';
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateLastActivity = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
  }, []);

  const handleInactivityLogout = useCallback(async () => {
    toast.info('Session expired due to inactivity');
    await supabase.auth.signOut();
    setIsAdmin(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    updateLastActivity();
    inactivityTimerRef.current = setTimeout(handleInactivityLogout, INACTIVITY_TIMEOUT);
  }, [handleInactivityLogout, updateLastActivity]);

  // Check if session expired while away (tab/browser closed > 30 min)
  const checkSessionExpiry = useCallback(() => {
    const lastActivity = localStorage.getItem(ACTIVITY_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT) {
        return true; // expired
      }
    }
    return false;
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole().then(setIsAdmin);
          }, 0);
          resetInactivityTimer();
        } else {
          setIsAdmin(false);
          if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Check if user was away too long
        if (checkSessionExpiry()) {
          toast.info('Session expired due to inactivity');
          supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
        checkAdminRole().then(setIsAdmin);
        resetInactivityTimer();
      }
      setIsLoading(false);
    });

    // Activity tracking — throttled to once per 60s
    let lastTracked = Date.now();
    const trackActivity = () => {
      if (Date.now() - lastTracked > 60000) {
        lastTracked = Date.now();
        resetInactivityTimer();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove', 'click'];
    events.forEach(e => window.addEventListener(e, trackActivity, { passive: true }));

    // When tab becomes visible again, check expiry
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (checkSessionExpiry()) {
          handleInactivityLogout();
        } else {
          resetInactivityTimer();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      events.forEach(e => window.removeEventListener(e, trackActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer, checkSessionExpiry, handleInactivityLogout]);

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if account is currently locked
    try {
      const { data: lockData } = await supabase.rpc('check_login_attempt', { _email: cleanEmail });
      const lock = lockData as { locked?: boolean; remaining_seconds?: number } | null;
      if (lock?.locked) {
        const mins = Math.ceil((lock.remaining_seconds || 0) / 60);
        return { error: new Error(`Account temporarily locked due to too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.`) };
      }
    } catch (e) {
      console.warn('Lockout check failed', e);
    }

    // 2. Attempt sign-in
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    // 3. Record outcome
    try {
      if (error) {
        const { data: failData } = await supabase.rpc('record_failed_login', { _email: cleanEmail });
        const fail = failData as { locked?: boolean; failed_count?: number } | null;
        if (fail?.locked) {
          return { error: new Error('Too many failed attempts — account locked for 15 minutes for your protection.') };
        }
      } else {
        await supabase.rpc('reset_login_attempts', { _email: cleanEmail });
      }
    } catch (e) {
      console.warn('Login attempt logging failed', e);
    }

    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
