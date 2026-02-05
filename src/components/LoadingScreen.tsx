import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [stars, setStars] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [showContent, setShowContent] = useState(false);
  const [scribbleProgress, setScribbleProgress] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Generate tingling/chime sounds
  const playTinglingSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create multiple chime/tingle sounds
      const playChime = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        // Full volume (1.0 = 100%)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(1.0, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      // Star falling frequencies (magical tingling sounds)
      const frequencies = [2093, 2637, 3136, 2349, 1760, 2093, 2794, 3520, 1975, 2489];
      const now = audioContext.currentTime;

      // Play cascading chimes over 3 seconds
      for (let i = 0; i < 20; i++) {
        const delay = (i * 0.15) + (Math.random() * 0.1);
        const freq = frequencies[i % frequencies.length] * (0.8 + Math.random() * 0.4);
        playChime(now + delay, freq, 0.8 + Math.random() * 0.4);
      }

      // Add sparkle overtones
      for (let i = 0; i < 15; i++) {
        const delay = (i * 0.2) + 0.05;
        const freq = 4000 + Math.random() * 2000;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(freq, now + delay);
        
        gainNode.gain.setValueAtTime(0, now + delay);
        gainNode.gain.linearRampToValueAtTime(0.5, now + delay + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.3);
        
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.3);
      }
    } catch (error) {
      console.log('Audio not supported:', error);
    }
  };

  useEffect(() => {
    // Generate falling stars
    const newStars = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setStars(newStars);

    // Play sound immediately
    playTinglingSound();

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
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(completeTimer);
      clearInterval(scribbleInterval);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
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
        className={`relative z-10 text-center transition-all duration-1000 ${
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

          {/* Main title with scribble reveal */}
          <h1 
            className="text-5xl md:text-7xl font-display font-bold gradient-text mb-2 relative"
            style={{
              clipPath: `inset(0 ${100 - scribbleProgress}% 0 0)`,
              transition: 'clip-path 0.1s ease-out',
            }}
          >
            <span className="animate-scribble-text">CHOPA</span>
          </h1>
          
          <h2 
            className="text-3xl md:text-4xl font-display font-semibold text-foreground/90"
            style={{
              clipPath: `inset(0 ${100 - Math.max(0, scribbleProgress - 30)}% 0 0)`,
              transition: 'clip-path 0.1s ease-out',
            }}
          >
            <span className="animate-scribble-text">COSMETICS LIMITED</span>
          </h2>

          {/* Scribble underline effect */}
          <div 
            className="h-1 mt-2 mx-auto rounded-full"
            style={{
              background: 'var(--gradient-primary)',
              width: `${scribbleProgress}%`,
              maxWidth: '300px',
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
