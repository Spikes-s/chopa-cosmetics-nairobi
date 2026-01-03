import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [stars, setStars] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Generate falling stars
    const newStars = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setStars(newStars);

    // Show content after a brief delay
    const contentTimer = setTimeout(() => setShowContent(true), 500);
    
    // Complete loading after animation
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center mirage-bg overflow-hidden">
      {/* Falling Stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute text-accent animate-star-fall"
            style={{
              left: `${star.left}%`,
              top: '30%',
              animationDelay: `${star.delay}s`,
            }}
          >
            <Star className="w-3 h-3 fill-current" />
          </div>
        ))}
      </div>

      {/* Logo */}
      <div
        className={`relative z-10 text-center transition-all duration-1000 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl font-display font-bold gradient-text mb-2">
            CHOPA
          </h1>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-foreground/90">
            COSMETICS LIMITED
          </h2>
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
