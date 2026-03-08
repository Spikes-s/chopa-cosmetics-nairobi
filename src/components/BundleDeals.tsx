import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BundleDeal {
  id: string;
  name: string;
  description: string | null;
  bundle_type: string;
  buy_quantity: number;
  get_quantity: number;
  discount_percent: number;
  category_filter: string | null;
  ends_at: string | null;
}

const BundleDeals = () => {
  const [deals, setDeals] = useState<BundleDeal[]>([]);

  useEffect(() => {
    const fetchDeals = async () => {
      const { data } = await supabase
        .from('bundle_deals')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) setDeals(data as any);
    };
    fetchDeals();
  }, []);

  if (deals.length === 0) return null;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Bundle Deals
            </h2>
            <p className="text-muted-foreground text-sm">Save more when you buy together</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <Card key={deal.id} className="gold-glow border-accent/20 overflow-hidden group hover:scale-[1.02] transition-transform">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                    {deal.bundle_type === 'buy_x_get_y' ? '🎁 FREE ITEM' : '💰 COMBO DEAL'}
                  </Badge>
                  {deal.ends_at && (
                    <span className="text-xs text-muted-foreground">Limited time</span>
                  )}
                </div>

                <h3 className="text-xl font-display font-bold text-foreground mb-2">{deal.name}</h3>
                {deal.description && (
                  <p className="text-sm text-muted-foreground mb-4">{deal.description}</p>
                )}

                <div className="bg-primary/10 rounded-lg p-4 mb-4">
                  {deal.bundle_type === 'buy_x_get_y' ? (
                    <p className="text-center font-semibold text-foreground">
                      Buy <span className="text-primary text-2xl font-bold">{deal.buy_quantity}</span>
                      {' → Get '}
                      <span className="text-accent text-2xl font-bold">{deal.get_quantity}</span>
                      {' FREE!'}
                    </p>
                  ) : (
                    <p className="text-center font-semibold text-foreground">
                      Save <span className="text-accent text-2xl font-bold">{deal.discount_percent}%</span>
                      {' on combo!'}
                    </p>
                  )}
                </div>

                <Button asChild variant="gradient" className="w-full">
                  <Link to={deal.category_filter ? `/products?category=${deal.category_filter}` : '/products'}>
                    Shop Now <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BundleDeals;
