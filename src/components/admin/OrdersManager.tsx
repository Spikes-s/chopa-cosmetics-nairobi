import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Package, Phone, MapPin, Clock, Gift } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_type: string;
  delivery_address: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  payment_status: string;
  order_status: string;
  reward_type: string | null;
  created_at: string;
}

const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, field: 'payment_status' | 'order_status', value: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ [field]: value })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });
    }
  };

  const setReward = async (orderId: string, rewardType: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ reward_type: rewardType })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to set reward',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Reward assigned successfully',
      });
      fetchOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        orders.map(order => (
          <Card key={order.id} className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{order.customer_name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {order.customer_phone}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(order.created_at), 'PPp')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">Ksh {order.total.toLocaleString()}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge className={getStatusColor(order.payment_status)}>
                      {order.payment_status}
                    </Badge>
                    <Badge className={getStatusColor(order.order_status)}>
                      {order.order_status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Items
                  </p>
                  <ul className="space-y-1">
                    {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                      <li key={idx}>
                        {item.quantity}x {item.name} - Ksh {item.price}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  {order.delivery_type === 'delivery' ? (
                    <p className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-1" />
                      <span>{order.delivery_address || 'No address provided'}</span>
                    </p>
                  ) : (
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Pickup: {order.pickup_date} at {order.pickup_time}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Payment:</span>
                  <Select
                    value={order.payment_status}
                    onValueChange={(value) => updateOrderStatus(order.id, 'payment_status', value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Order:</span>
                  <Select
                    value={order.order_status}
                    onValueChange={(value) => updateOrderStatus(order.id, 'order_status', value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {order.total >= 50000 && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-accent" />
                    <Select
                      value={order.reward_type || ''}
                      onValueChange={(value) => setReward(order.id, value)}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue placeholder="Assign Reward" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free_delivery">Free Delivery</SelectItem>
                        <SelectItem value="apron">Branded Apron</SelectItem>
                        <SelectItem value="gift_bag">Gift Bag</SelectItem>
                        <SelectItem value="discount_voucher">Discount Voucher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default OrdersManager;
