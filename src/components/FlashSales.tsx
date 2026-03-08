import { useState, useEffect } from 'react';
import { Zap, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';

interface FlashProduct {
  id: string;
  name: string;
  retail_price: number;
  wholesale_price: number | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  in_stock: boolean;
  description: string | null;
  sale_price: number;
  sale_ends_at: string;
  sale_label: string | null;
}

const useCountdown = (targetDate: string) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
};

const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 min-w-[3rem] text-center border border-accent/30">
      <span className="text-xl font-bold text-accent font-mono">{String(value).padStart(2, '0')}</span>
    </div>
    <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
  </div>
);

const FlashSaleItem = ({ product }: { product: FlashProduct }) => {
  const { hours, minutes, seconds, expired } = useCountdown(product.sale_ends_at);
  const discount = Math.round(((product.retail_price - product.sale_price) / product.retail_price) * 100);

  if (expired) return null;

  return (
    <div className="relative">
      {/* Sale badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
        <Zap className="w-3 h-3" />
        {discount}% OFF
      </div>
      
      {/* Countdown overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-3 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="flex items-center gap-2 justify-center">
          <Timer className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs text-muted-foreground">Ends in</span>
          <div className="flex gap-1.5">
            <CountdownUnit value={hours} label="hrs" />
            <span className="text-accent font-bold self-start mt-1.5">:</span>
            <CountdownUnit value={minutes} label="min" />
            <span className="text-accent font-bold self-start mt-1.5">:</span>
            <CountdownUnit value={seconds} label="sec" />
          </div>
        </div>
      </div>

      <ProductCard
        product={{
          id: product.id,
          name: product.sale_label ? `${product.sale_label} - ${product.name}` : product.name,
          price: product.sale_price,
          wholesalePrice: product.wholesale_price || 0,
          image: product.image_url || '/placeholder.svg',
          category: product.category,
          subcategory: product.subcategory || '',
          description: product.description || '',
          inStock: product.in_stock,
        }}
      />
    </div>
  );
};

const FlashSales = () => {
  const [products, setProducts] = useState<FlashProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFlashSales = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, retail_price, wholesale_price, image_url, category, subcategory, in_stock, description, sale_price, sale_ends_at, sale_label')
        .not('sale_price', 'is', null)
        .not('sale_ends_at', 'is', null)
        .gt('sale_ends_at', new Date().toISOString())
        .order('sale_ends_at', { ascending: true })
        .limit(6);

      if (!error && data) {
        setProducts(data as FlashProduct[]);
      }
      setIsLoading(false);
    };

    fetchFlashSales();

    const channel = supabase
      .channel('flash-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchFlashSales();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (isLoading || products.length === 0) return null;

  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      {/* Animated glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-destructive/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive to-accent flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Flash Sales
              </h2>
              <p className="text-muted-foreground text-sm">
                Limited time offers — grab them before they're gone!
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
          {products.map((product) => (
            <FlashSaleItem key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FlashSales;
