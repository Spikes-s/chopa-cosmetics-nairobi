import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface CartItem {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  wholesaleMinQty?: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
  category: string;
  variant?: string; // e.g. "Vanilla, 250ml"
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalWithWholesale: number;
  getItemWholesaleThreshold: (item: CartItem) => number;
  addViewedProduct: (productId: string) => void;
  lastViewedProducts: string[];
  showCartNotification: boolean;
  hideCartNotification: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [lastViewedProducts, setLastViewedProducts] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCartNotification, setShowCartNotification] = useState(false);

  const hideCartNotification = useCallback(() => {
    setShowCartNotification(false);
  }, []);

  // Save cart to database for logged-in users
  const saveCartToDatabase = useCallback(async (cartItems: CartItem[], viewedProducts: string[]) => {
    if (!user) return;
    
    try {
      // Check if cart exists
      const { data: existingCart } = await supabase
        .from('saved_carts')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCart) {
        // Update existing cart
        const { error } = await supabase
          .from('saved_carts')
          .update({
            items: JSON.parse(JSON.stringify(cartItems)),
            last_viewed_products: viewedProducts as string[],
          })
          .eq('user_id', user.id);
        
        if (error) console.error('Error updating cart:', error);
      } else {
        // Insert new cart
        const { error } = await supabase
          .from('saved_carts')
          .insert([{
            user_id: user.id,
            items: JSON.parse(JSON.stringify(cartItems)),
            last_viewed_products: viewedProducts as string[],
          }]);
        
        if (error) console.error('Error inserting cart:', error);
      }
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  }, [user]);

  // Load cart from database when user logs in
  const loadCartFromDatabase = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_carts')
        .select('items, last_viewed_products')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading cart:', error);
        return;
      }
      
      if (data) {
        const savedItems = (data.items as unknown as CartItem[]) || [];
        const savedViewed = (data.last_viewed_products as unknown as string[]) || [];
        setItems(savedItems);
        setLastViewedProducts(savedViewed);
      }
    } catch (err) {
      console.error('Failed to load cart:', err);
    }
  }, [user]);

  // Initialize cart based on auth state
  useEffect(() => {
    if (user) {
      // User logged in - load their saved cart from database
      loadCartFromDatabase().then(() => setIsInitialized(true));
    } else {
      // User not logged in - start with empty cart (session-based)
      setItems([]);
      setLastViewedProducts([]);
      setIsInitialized(true);
    }
  }, [user, loadCartFromDatabase]);

  // Save to database whenever cart changes (for logged-in users)
  useEffect(() => {
    if (isInitialized && user) {
      saveCartToDatabase(items, lastViewedProducts);
    }
  }, [items, lastViewedProducts, user, isInitialized, saveCartToDatabase]);

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.id === newItem.id &&
          item.size === newItem.size &&
          item.color === newItem.color
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }

      return [...prev, newItem];
    });
    
    // Trigger notification
    setShowCartNotification(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setItems([]);

  const addViewedProduct = (productId: string) => {
    setLastViewedProducts(prev => {
      const filtered = prev.filter(id => id !== productId);
      return [productId, ...filtered].slice(0, 10); // Keep last 10 viewed
    });
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const getItemWholesaleThreshold = (item: CartItem) => {
    if (item.wholesaleMinQty && item.wholesaleMinQty > 0) {
      return item.wholesaleMinQty;
    }
    const isBraid = item.category.toLowerCase().includes('braid');
    return isBraid ? 10 : 6;
  };

  const calculateItemPrice = (item: CartItem) => {
    const wholesaleThreshold = getItemWholesaleThreshold(item);
    
    if (item.quantity >= wholesaleThreshold && item.wholesalePrice > 0) {
      return item.wholesalePrice * item.quantity;
    }
    return item.price * item.quantity;
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalWithWholesale = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        totalWithWholesale,
        getItemWholesaleThreshold,
        addViewedProduct,
        lastViewedProducts,
        showCartNotification,
        hideCartNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
