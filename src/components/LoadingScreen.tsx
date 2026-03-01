import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [stars, setStars] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [showContent, setShowContent] = useState(false);
  const [scribbleProgress, setScribbleProgress] = useState(0);

  useEffect(() => {
    // Generate falling stars
    const newStars = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setStars(newStars);

    // Animate scribble effect
    const scribbleInterval = setInterval(() => {
      setScribbleProgress(prev => {
        if (prev >= 100) {
          clearInterval(scribbleInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    // Show content after a brief delay
    const contentTimer = setTimeout(() => setShowContent(true), 300);
    
    // Complete loading after animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(completeTimer);
      clearInterval(scribbleInterval);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center mirage-bg overflow-hidden animate-fade-in">
      {/* Falling Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute text-accent animate-star-fall"
            style={{
              left: `${star.left}%`,
              top: '-5%',
              animationDelay: `${star.delay}s`,
            }}
          >
            <Star className="w-3 h-3 fill-current drop-shadow-[0_0_8px_hsl(var(--accent))]" />
          </div>
        ))}
      </div>

      {/* Logo with Scribble Effect */}
      <div
        className={`relative z-10 text-center transition-all duration-1000 px-4 w-full max-w-4xl ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="mb-8 relative">
          {/* Scribble SVG overlay */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 120"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="scribbleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(280, 60%, 55%)" />
                <stop offset="50%" stopColor="hsl(320, 70%, 50%)" />
                <stop offset="100%" stopColor="hsl(210, 80%, 50%)" />
              </linearGradient>
            </defs>
            {/* Decorative scribble lines */}
            <path
              d="M 20 60 Q 100 20, 200 60 T 380 60"
              fill="none"
              stroke="url(#scribbleGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-scribble-draw"
              style={{
                strokeDasharray: 500,
                strokeDashoffset: 500 - (scribbleProgress * 5),
                opacity: 0.6,
              }}
            />
            <path
              d="M 30 70 Q 120 110, 200 70 T 370 70"
              fill="none"
              stroke="url(#scribbleGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                strokeDasharray: 500,
                strokeDashoffset: 500 - (scribbleProgress * 5),
                opacity: 0.4,
              }}
            />
          </svg>

          {/* Main title - CHOPA COSMETICS LIMITED - with flashing colors */}
          <h1 
            className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-display font-bold mb-2 relative animate-color-flash leading-tight"
            style={{
              clipPath: `inset(0 ${100 - scribbleProgress}% 0 0)`,
              transition: 'clip-path 0.1s ease-out',
            }}
          >
            CHOPA COSMETICS
          </h1>
          
          <h2 
            className="text-lg xs:text-xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-semibold animate-color-flash"
            style={{
              clipPath: `inset(0 ${100 - Math.max(0, scribbleProgress - 20)}% 0 0)`,
              transition: 'clip-path 0.1s ease-out',
              animationDelay: '0.5s',
            }}
          >
            LIMITED
          </h2>

          {/* Scribble underline effect */}
          <div 
            className="h-1 mt-4 mx-auto rounded-full"
            style={{
              background: 'var(--gradient-primary)',
              width: `${scribbleProgress}%`,
              maxWidth: '350px',
              transition: 'width 0.1s ease-out',
              boxShadow: '0 0 20px hsl(280, 60%, 50%, 0.5)',
            }}
          />
        </div>

        {/* Motto */}
        <p
          className={`text-xl md:text-2xl text-muted-foreground font-body italic mb-12 transition-all duration-1000 delay-500 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          "Beauty At Your Proximity"
        </p>

        {/* Location & Hours */}
        <div
          className={`space-y-4 transition-all duration-1000 delay-700 ${
            showContent ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="glass-card rounded-xl p-6 max-w-md mx-auto">
            <h3 className="text-accent font-semibold mb-2 font-display">Location</h3>
            <p className="text-foreground/80 text-sm font-body leading-relaxed">
              KAKA HOUSE – OTC, along Racecourse Road,
              <br />
              opposite Kaka Travellers Sacco
            </p>
          </div>

          <div className="glass-card rounded-xl p-4 max-w-md mx-auto">
            <h3 className="text-accent font-semibold mb-2 font-display">Opening Hours</h3>
            <p className="text-foreground/80 text-sm font-body">
              7:30 AM – 9:00 PM
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="mt-10 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" style={{ animationDelay: '0.2s' }} />
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
