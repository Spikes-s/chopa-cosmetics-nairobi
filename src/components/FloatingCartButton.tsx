import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

const FloatingCartButton = () => {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/cart')}
      className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all hover:scale-105 flex items-center justify-center"
      style={{ position: 'fixed', boxShadow: '0 0 20px rgba(22, 163, 74, 0.5)' }}
    >
      <ShoppingCart className="w-6 h-6" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
          {totalItems}
        </span>
      )}
    </button>
  );
};

export default FloatingCartButton;
