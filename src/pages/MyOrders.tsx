import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Package, FileDown } from 'lucide-react';
import { downloadReceiptPDF } from '@/lib/receipt';
import OrderTracker from '@/components/OrderTracker';

interface Order {
  id: string;
  order_status: string;
  delivery_type: string;
  delivery_address: string | null;
  items: any;
  subtotal: number;
  delivery_fee: number | null;
  total: number;
  created_at: string;
  status_history: any;
  payment_status: string;
  receipt_number: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  mpesa_code: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
}

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_status, delivery_type, delivery_address, items, subtotal, delivery_fee, total, created_at, status_history, payment_status, receipt_number, customer_name, customer_phone, customer_email, mpesa_code, pickup_date, pickup_time')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();

    // Realtime updates
    const channel = supabase
      .channel('my-orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">My Orders</h1>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Button onClick={() => navigate('/products')}>Start Shopping</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const isExpanded = expandedOrder === order.id;

            return (
              <Card key={order.id} variant="gradient" className="overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
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
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">{order.delivery_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">Ksh {Number(order.total).toLocaleString()}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          order.payment_status === 'paid' || order.payment_status === 'confirmed'
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                          {order.payment_status}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Order Status Timeline - always visible */}
                  <div className="mt-4 pt-4 border-t border-border">
                    <OrderTracker
                      currentStatus={order.order_status}
                      statusHistory={Array.isArray(order.status_history) ? order.status_history : []}
                    />
                  </div>

                  {/* Expanded: Items + Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-4">
                      {/* Items list */}
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">Items</h4>
                        <div className="space-y-2">
                          {items.map((item: any, i: number) => {
                            const variantInfo = [item.color, item.variant].filter(Boolean).join(', ');
                            return (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                {item.image && (
                                  <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">{item.name}</p>
                                  {variantInfo && (
                                    <p className="text-xs text-muted-foreground">{variantInfo}</p>
                                  )}
                                </div>
                                <span className="text-muted-foreground">x{item.quantity}</span>
                                <span className="font-medium text-foreground">
                                  Ksh {(item.price * item.quantity).toLocaleString()}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {order.delivery_address && (
                        <div className="text-sm">
                          <span className="font-medium text-foreground">Delivery to:</span>{' '}
                          <span className="text-muted-foreground">{order.delivery_address}</span>
                        </div>
                      )}

                      {/* Download PDF Receipt */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => downloadReceiptPDF(order)}
                      >
                        <FileDown className="w-4 h-4" />
                        Download Receipt
                      </Button>
                    </div>
                  )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
