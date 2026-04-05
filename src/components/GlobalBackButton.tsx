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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="fixed top-[72px] left-3 z-30 md:top-[84px] md:left-4 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:bg-muted gap-1.5 px-3"
      aria-label="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="text-sm font-medium">Back</span>
    </Button>
  );
};

export default GlobalBackButton;
