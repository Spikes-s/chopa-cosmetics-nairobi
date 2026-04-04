import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GlobalBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on home page or admin routes
  if (location.pathname === '/' || location.pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate(-1)}
      className="fixed top-[72px] left-3 z-30 md:top-[84px] md:left-4 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted"
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </Button>
  );
};

export default GlobalBackButton;
