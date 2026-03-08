import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'chopa-cookie-consent';

type ConsentStatus = 'accepted' | 'declined' | null;

export const getCookieConsent = (): ConsentStatus => {
  return localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentStatus;
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      // Small delay so it doesn't compete with loading screen
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
    // If previously declined, disable GA
    if (consent === 'declined') {
      disableGA();
    }
  }, []);

  const disableGA = () => {
    // Disable GA tracking
    (window as any)[`ga-disable-G-3GMYZJJS2S`] = true;
  };

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    disableGA();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm md:text-base mb-1">We value your privacy 🍪</h3>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              We use cookies and Google Analytics to understand how you use our site and improve your experience. 
              You can accept or decline non-essential cookies. See our{' '}
              <a href="/privacy" className="text-primary underline hover:text-primary/80 transition-colors">
                Privacy Policy
              </a>{' '}
              for more details.
            </p>
          </div>
          <button onClick={handleDecline} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button variant="outline" size="sm" onClick={handleDecline} className="text-xs">
            Decline
          </Button>
          <Button size="sm" onClick={handleAccept} className="text-xs">
            Accept All Cookies
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
