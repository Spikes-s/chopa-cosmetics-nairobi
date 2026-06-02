import { useState, useEffect } from 'react';
import brandCard from '@/assets/chopa-brand-card.jpg';
import CircularLoader from './CircularLoader';

interface LoadingScreenProps {
  onComplete: () => void;
}

type Phase = 'splash' | 'fadeout' | 'loader';

/**
 * Premium splash + loader sequence:
 * 1. Brand card fades in and holds (~2s total)
 * 2. Smooth fade-out
 * 3. Circular branded loader (~1.2s)
 * 4. onComplete -> homepage
 */
const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [phase, setPhase] = useState<Phase>('splash');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fadeout'), 2000);
    const t2 = setTimeout(() => setPhase('loader'), 2600);
    const t3 = setTimeout(() => onComplete(), 3900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 50% 40%, hsl(340 60% 18%) 0%, hsl(330 40% 10%) 60%, hsl(270 30% 6%) 100%)',
      }}
    >
      {/* Soft sparkles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              top: `${(i * 53) % 100}%`,
              left: `${(i * 37) % 100}%`,
              width: 3,
              height: 3,
              background: 'hsl(45 90% 80%)',
              boxShadow: '0 0 8px hsl(45 90% 70%)',
              opacity: 0.6,
              animationDelay: `${(i % 6) * 0.3}s`,
              animationDuration: '2.4s',
            }}
          />
        ))}
      </div>

      {/* Brand splash */}
      {phase !== 'loader' && (
        <div
          className="relative z-10 px-6 w-full max-w-md transition-opacity duration-700 ease-in-out"
          style={{ opacity: phase === 'fadeout' ? 0 : 1 }}
        >
          <div
            className="rounded-3xl overflow-hidden animate-scale-in"
            style={{
              boxShadow:
                '0 30px 80px -20px hsl(330 80% 50% / 0.45), 0 0 0 1px hsl(45 90% 70% / 0.25)',
            }}
          >
            <img
              src={brandCard}
              alt="Chopa Cosmetics — Beauty At Your Proximity"
              width={1024}
              height={1024}
              className="w-full h-auto block"
            />
          </div>
        </div>
      )}

      {/* Loader phase */}
      {phase === 'loader' && (
        <div className="relative z-10 animate-fade-in">
          <CircularLoader size={180} />
        </div>
      )}
    </div>
  );
};

export default LoadingScreen;
