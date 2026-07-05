import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { onCartPulse } from '@/lib/cartPulse';

const FloatingCartButton = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const off = onCartPulse(() => {
      if (timer.current) window.clearTimeout(timer.current);
      setPulse(true);
      timer.current = window.setTimeout(() => setPulse(false), 900);
    });
    return () => {
      off();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  return (
    <button
      onClick={() => navigate('/cart')}
      aria-label="View cart"
      className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90 transition-all hover:scale-105 flex items-center justify-center ${pulse ? 'animate-cart-pulse' : ''}`}
      style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.5)' }}
    >
      <ShoppingCart className="w-6 h-6" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </button>
  );
};

export default FloatingCartButton;
