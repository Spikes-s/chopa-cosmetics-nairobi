import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Package, Phone, MapPin, Clock, Gift, Bell, CheckCircle, Archive, Search, X, Printer, FileDown } from 'lucide-react';
import { printReceipt, downloadReceiptPDF } from '@/lib/receipt';
import { toast as sonnerToast } from 'sonner';

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
  mpesa_code?: string | null;
  status_history?: any;
  completed_at?: string | null;
  receipt_number?: string | null;
}

const OrdersManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('active');
  const { toast } = useToast();

  // Search/filter state for completed orders
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
      .channel('orders-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        setOrders(prev => [newOrder, ...prev]);
        setNewOrderIds(prev => new Set([...prev, newOrder.id]));
        
        // Show notification
        sonnerToast.success('New Order Received!', {
          description: `${newOrder.customer_name} - Ksh ${newOrder.total.toLocaleString()}`,
          icon: <Bell className="w-4 h-4" />,
          duration: 10000,
        });

        // Play notification sound (optional)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleA4MU5nQ16RzGAgwi8rMpHwVDESFx8ajfBkQP4PDv5p3Gw87g8K6lHIbEDuDwrqUchsQO4PCupRyGxA7g8K6lHIbEDuDwrqUchsQO4PCupRyGxA7g8K6lHIbEDuDwrqUchsQO4PCupRyGxA7g8K6lHIbEDuDwrqUchsQO4O/');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updatedOrder = payload.new as Order;
        setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
        
        if (updatedOrder.payment_status === 'confirmed') {
          sonnerToast.success('Payment Confirmed!', {
            description: `${updatedOrder.customer_name} - Ksh ${updatedOrder.total.toLocaleString()}`,
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, field: 'payment_status' | 'order_status', value: string) => {
    // Get current order to update status history
    const currentOrder = orders.find(o => o.id === orderId);
    const statusHistory = Array.isArray(currentOrder?.status_history) ? currentOrder.status_history : [];
    
    const newHistoryEntry = {
      field,
      value,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('orders')
      .update({ 
        [field]: value,
        status_history: [...statusHistory, newHistoryEntry]
      })
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

      // Send email notification for relevant status changes
      if (currentOrder?.customer_email) {
        let emailType: string | null = null;
        
        if (field === 'payment_status' && value === 'confirmed') {
          emailType = 'payment_confirmed';
        } else if (field === 'order_status' && (value === 'ready_for_pickup' || value === 'out_for_delivery')) {
          emailType = 'order_ready';
        } else if (field === 'order_status' && value === 'completed') {
          emailType = 'order_completed';
        }

        if (emailType) {
          try {
            await supabase.functions.invoke('send-order-email', {
              body: {
                customerName: currentOrder.customer_name,
                customerEmail: currentOrder.customer_email,
                orderId: currentOrder.id,
                items: Array.isArray(currentOrder.items) ? currentOrder.items : [],
                total: currentOrder.total,
                deliveryType: currentOrder.delivery_type,
                emailType,
              },
            });
          } catch (emailError) {
            console.error('Email notification error:', emailError);
          }
        }
      }

      // Clear new status when interacted with
      setNewOrderIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
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
    }
  };

  const completeOrder = async (orderId: string) => {
    const currentOrder = orders.find(o => o.id === orderId);
    const statusHistory = Array.isArray(currentOrder?.status_history) ? currentOrder.status_history : [];
    
    const completedAt = new Date().toISOString();
    const newHistoryEntry = {
      field: 'order_status',
      value: 'completed',
      timestamp: completedAt,
    };

    const { error } = await supabase
      .from('orders')
      .update({ 
        order_status: 'completed',
        payment_status: currentOrder?.payment_status === 'pending' ? 'confirmed' : currentOrder?.payment_status,
        status_history: [...statusHistory, newHistoryEntry],
      })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete order',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Order Completed',
        description: 'Order has been moved to completed orders',
      });

      // Send completion email if customer has email
      if (currentOrder?.customer_email) {
        try {
          await supabase.functions.invoke('send-order-email', {
            body: {
              customerName: currentOrder.customer_name,
              customerEmail: currentOrder.customer_email,
              orderId: currentOrder.id,
              items: Array.isArray(currentOrder.items) ? currentOrder.items : [],
              total: currentOrder.total,
              deliveryType: currentOrder.delivery_type,
              emailType: 'order_completed',
            },
          });
        } catch (emailError) {
          console.error('Email notification error:', emailError);
        }
      }

      // Clear new status
      setNewOrderIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'processing':
      case 'ready_for_pickup':
      case 'out_for_delivery':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Separate active and completed orders
  const activeOrders = orders.filter(o => o.order_status !== 'completed');
  const allCompletedOrders = orders.filter(o => o.order_status === 'completed');

  // Filtered completed orders based on search criteria
  const completedOrders = useMemo(() => {
    return allCompletedOrders.filter(order => {
      // Search by customer name
      if (searchQuery && !order.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Filter by amount range
      if (minAmount && order.total < parseFloat(minAmount)) {
        return false;
      }
      if (maxAmount && order.total > parseFloat(maxAmount)) {
        return false;
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        const orderDate = parseISO(order.created_at);
        if (dateFrom && orderDate < startOfDay(parseISO(dateFrom))) {
          return false;
        }
        if (dateTo && orderDate > endOfDay(parseISO(dateTo))) {
          return false;
        }
      }

      return true;
    });
  }, [allCompletedOrders, searchQuery, minAmount, maxAmount, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
    setDateFrom('');
    setDateTo('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const renderOrderCard = (order: Order, isCompletedView: boolean = false) => (
    <Card 
      key={order.id} 
      className={`glass-card transition-all ${
        newOrderIds.has(order.id) 
          ? 'ring-2 ring-green-500 animate-pulse' 
          : ''
      }`}
    >
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{order.customer_name}</h3>
              {newOrderIds.has(order.id) && (
                <Badge className="bg-green-500 text-white animate-bounce">NEW</Badge>
              )}
              {isCompletedView && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" /> Completed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Phone className="w-3 h-3" /> {order.customer_phone}
            </p>
            {order.customer_email && (
              <p className="text-sm text-muted-foreground">
                ✉️ {order.customer_email}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {order.receipt_number && (
                <span className="font-mono text-primary mr-2">{order.receipt_number}</span>
              )}
              ID: {order.id.slice(0, 8)} • {format(new Date(order.created_at), 'PPp')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">Ksh {order.total.toLocaleString()}</p>
            {order.delivery_fee > 0 && (
              <p className="text-xs text-muted-foreground">
                (incl. Ksh {order.delivery_fee} delivery)
              </p>
            )}
            {order.mpesa_code && (
              <p className="text-xs text-accent font-mono mt-1">
                M-Pesa: {order.mpesa_code}
              </p>
            )}
            <div className="flex gap-2 mt-1 justify-end">
              <Badge className={getStatusColor(order.payment_status)}>
                {formatStatus(order.payment_status)}
              </Badge>
              <Badge className={getStatusColor(order.order_status)}>
                {formatStatus(order.order_status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Items
            </p>
            <ul className="space-y-2">
              {Array.isArray(order.items) && order.items.map((item: any, idx: number) => {
                const variantInfo = [item.color, item.variant].filter(Boolean).join(', ');
                return (
                  <li key={idx} className="flex items-center gap-2">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{item.quantity}x {item.name} - Ksh {item.price}</span>
                      {variantInfo && (
                        <p className="text-xs text-muted-foreground">{variantInfo}</p>
                      )}
                    </div>
                  </li>
                );
              })}
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

        {!isCompletedView && (
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Payment:</span>
              <Select
                value={order.payment_status}
                onValueChange={(value) => updateOrderStatus(order.id, 'payment_status', value)}
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
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
                <SelectTrigger className="w-40 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
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

            <Button
              onClick={() => printReceipt(order)}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>

            <Button
              onClick={() => downloadReceiptPDF(order)}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </Button>

            <Button
              onClick={() => completeOrder(order.id)}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white ml-auto"
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Complete Order
            </Button>
          </div>
        )}

        {isCompletedView && (
          <div className="flex gap-2 justify-end pt-2 border-t border-border/50">
            <Button
              onClick={() => printReceipt(order)}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button
              onClick={() => downloadReceiptPDF(order)}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Active Orders ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Completed Orders ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {activeOrders.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active orders.</p>
              </CardContent>
            </Card>
          ) : (
            activeOrders.map(order => renderOrderCard(order, false))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {/* Search and Filter Section */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search & Filter Completed Orders
                </h3>
                {(searchQuery || minAmount || maxAmount || dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                    <X className="w-4 h-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Customer Name Search */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Customer Name</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                {/* Amount Range */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount Range (Ksh)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="w-1/2"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="w-1/2"
                    />
                  </div>
                </div>

                {/* Date From */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {completedOrders.length} of {allCompletedOrders.length} completed orders
              </p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <Archive className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Completed orders are archived and read-only. Once an order is completed, it cannot be edited unless restored by a super admin.
            </p>
          </div>
          
          {completedOrders.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No completed orders yet.</p>
              </CardContent>
            </Card>
          ) : (
            completedOrders.map(order => renderOrderCard(order, true))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersManager;
