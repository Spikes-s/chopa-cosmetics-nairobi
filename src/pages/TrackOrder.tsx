import { useState } from 'react';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Package, Search, MapPin, Truck, Receipt } from 'lucide-react';
import OrderTracker from '@/components/OrderTracker';

interface TrackedOrder {
  id: string;
  receipt_number: string | null;
  order_status: string;
  payment_status: string;
  delivery_type: string;
  delivery_address: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  items: any;
  status_history: any;
  created_at: string;
  updated_at: string;
}

const TrackOrder = () => {
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOrder(null);

    const cleanQuery = query.trim();
    const cleanPhone = phone.trim();

    if (cleanQuery.length < 4) {
      setError('Please enter your full order number or receipt number.');
      return;
    }
    if (!/^(?:\+254|0)[17]\d{8}$/.test(cleanPhone)) {
      setError('Please enter the phone number used for the order (e.g., 0712345678).');
      return;
    }

    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('lookup_order_public', {
        _query: cleanQuery,
        _phone: cleanPhone,
      });

      if (rpcError) throw rpcError;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) {
        setError('No order matches that order number and phone combination. Please double-check both and try again.');
      } else {
        setOrder(row as TrackedOrder);
      }
    } catch (e: any) {
      console.error('Track order lookup failed:', e);
      setError(e?.message || 'Could not look up your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const items = order && Array.isArray(order.items) ? order.items : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <SEO
        title="Track My Order | Chopa Cosmetics"
        description="Track the status of your Chopa Cosmetics order using your order number and phone."
        noindex
      />

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Track My Order</h1>
      </div>

      <Card variant="glass" className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Find your order</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <Label htmlFor="query">Order Number or Receipt Number</Label>
              <Input
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., ORD-20260607-0001 or first 8 chars of your order ID"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number Used for the Order</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 0712345678"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <LoadingButton
              type="submit"
              variant="gradient"
              className="w-full"
              loading={loading}
              loadingText="Looking up your order…"
            >
              <Search className="w-4 h-4 mr-2" />
              Track Order
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {order && (
        <Card variant="gradient" className="animate-fade-in">
          <CardContent className="p-4 md:p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
                {order.receipt_number && (
                  <span className="text-xs font-mono text-primary font-medium">
                    {order.receipt_number}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                Placed {new Date(order.created_at).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Payment</p>
                <p className="font-semibold capitalize text-foreground">{order.payment_status}</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Delivery</p>
                <p className="font-semibold capitalize text-foreground flex items-center gap-1">
                  {order.delivery_type === 'pickup' ? <MapPin className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                  {order.delivery_type}
                </p>
              </div>
            </div>

            {order.delivery_type === 'pickup' && (order.pickup_date || order.pickup_time) && (
              <div className="text-sm text-muted-foreground">
                Pickup scheduled for{' '}
                <span className="text-foreground font-medium">
                  {order.pickup_date} {order.pickup_time}
                </span>
              </div>
            )}
            {order.delivery_type === 'delivery' && order.delivery_address && (
              <div className="text-sm">
                <span className="text-muted-foreground">Delivering to:</span>{' '}
                <span className="font-medium text-foreground">{order.delivery_address}</span>
              </div>
            )}

            <div className="pt-2 border-t border-border">
              <OrderTracker
                currentStatus={order.order_status}
                statusHistory={Array.isArray(order.status_history) ? order.status_history : []}
              />
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Items
              </h3>
              <div className="space-y-2">
                {items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                    </div>
                    <span className="text-muted-foreground">x{item.quantity}</span>
                    <span className="font-medium text-foreground">
                      Ksh {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold gradient-text">Ksh {Number(order.total).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrackOrder;
