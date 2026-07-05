import { Minus, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface QuantityInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Editable quantity input with − / + buttons.
 * Opens the numeric keypad on mobile and clamps to min/max.
 */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 9999,
  size = 'md',
  className,
  ariaLabel = 'Quantity',
  disabled = false,
}: QuantityInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commit = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '');
    if (!digits) {
      setText(String(min));
      onChange(min);
      return;
    }
    const next = clamp(parseInt(digits, 10));
    setText(String(next));
    if (next !== value) onChange(next);
  };

  const btnSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const inputSize = size === 'sm' ? 'w-12 h-8 text-sm' : size === 'lg' ? 'w-20 h-11 text-lg' : 'w-16 h-10 text-base';

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-xl border-2 border-border bg-background overflow-hidden focus-within:border-primary transition-colors',
        disabled && 'opacity-60 pointer-events-none',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => {
          const next = clamp(value - 1);
          setText(String(next));
          onChange(next);
        }}
        disabled={disabled || value <= min}
        className={cn(
          btnSize,
          'flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-50',
        )}
      >
        <Minus className={iconSize} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => commit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={ariaLabel}
        className={cn(
          inputSize,
          'text-center font-semibold text-foreground bg-transparent border-x-2 border-border outline-none focus:bg-primary/5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
        )}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => {
          const next = clamp(value + 1);
          setText(String(next));
          onChange(next);
        }}
        disabled={disabled || value >= max}
        className={cn(
          btnSize,
          'flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-50',
        )}
      >
        <Plus className={iconSize} />
      </button>
    </div>
  );
}
