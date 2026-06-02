import { cn } from '@/lib/utils';

interface CircularLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

/**
 * Premium branded circular loader.
 * - Outer ring shows "CHOPA COSMETICS LIMITED" rotating around the circle.
 * - Center shows an elegant "C" with a soft glow + pulse.
 */
const CircularLoader = ({ size = 160, label, className }: CircularLoaderProps) => {
  const text = 'CHOPA COSMETICS LIMITED • CHOPA COSMETICS LIMITED • ';
  const id = 'chopa-circle-path';
  return (
    <div className={cn('relative flex flex-col items-center justify-center', className)} role="status" aria-live="polite">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(0 0 18px hsl(330 80% 70% / 0.45))',
        }}
      >
        {/* Rotating outer text */}
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          className="absolute inset-0 animate-spin"
          style={{ animationDuration: '12s' }}
        >
          <defs>
            <path
              id={id}
              d="M 100,100 m -82,0 a 82,82 0 1,1 164,0 a 82,82 0 1,1 -164,0"
            />
          </defs>
          <text
            fill="hsl(45 90% 70%)"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '13px',
              letterSpacing: '4px',
              fontWeight: 600,
            }}
          >
            <textPath href={`#${id}`} startOffset="0">
              {text}
            </textPath>
          </text>
        </svg>

        {/* Decorative thin ring */}
        <div
          className="absolute inset-3 rounded-full border"
          style={{ borderColor: 'hsl(45 90% 70% / 0.4)' }}
        />

        {/* Pulsing center C */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="flex items-center justify-center rounded-full animate-pulse"
            style={{
              width: size * 0.45,
              height: size * 0.45,
              background:
                'radial-gradient(circle at 30% 30%, hsl(340 90% 92%), hsl(330 70% 80%) 60%, hsl(330 60% 70%))',
              boxShadow:
                '0 0 24px hsl(330 80% 70% / 0.55), inset 0 0 18px hsl(45 90% 85% / 0.6)',
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: size * 0.28,
                fontWeight: 700,
                color: 'hsl(35 70% 35%)',
                textShadow: '0 1px 2px hsl(0 0% 100% / 0.6)',
                lineHeight: 1,
              }}
            >
              C
            </span>
          </div>
        </div>
      </div>
      {label && (
        <p className="mt-4 text-sm font-body tracking-wide text-foreground/80 animate-pulse">
          {label}
        </p>
      )}
      <span className="sr-only">Loading</span>
    </div>
  );
};

export default CircularLoader;
