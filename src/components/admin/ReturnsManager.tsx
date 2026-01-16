import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { RotateCcw, Search, Package, AlertTriangle, CheckCircle, History } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  items: OrderItem[];
  subtotal: number;
  total: number;
  delivery_type: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  sales_channel: string | null;
}

interface ReturnRecord {
  id: string;
  order_id: string;
  customer_name: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    color?: string;
    size?: string;
  }[];
  total_refund: number;
  reason: string;
  processed_by: string;
  created_at: string;
}

const ReturnsManager = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [returnItems, setReturnItems] = useState<Map<string, number>>(new Map());
  const [returnReason, setReturnReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Fetch completed e-commerce orders
  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_status', 'completed')
      .eq('sales_channel', 'online')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } else {
      // Parse items properly
      const parsedOrders = (data || []).map(order => ({
        id: order.id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        items: Array.isArray(order.items) ? (order.items as unknown as OrderItem[]) : [],
        subtotal: order.subtotal,
        total: order.total,
        delivery_type: order.delivery_type,
        order_status: order.order_status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        sales_channel: order.sales_channel,
      }));
      setOrders(parsedOrders);
    }
    setIsLoading(false);
  };

  // Fetch return history from site_settings (stored as JSON)
  const fetchReturns = async () => {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('key', 'returns_history')
      .single();

    if (!error && data?.value) {
      try {
        setReturns(JSON.parse(data.value));
      } catch {
        setReturns([]);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchReturns();
  }, []);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_phone.includes(query) ||
      order.id.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setReturnItems(new Map());
    setReturnReason('');
    setIsDialogOpen(true);
  };

  const handleToggleItem = (itemId: string, maxQty: number, checked: boolean) => {
    const newMap = new Map(returnItems);
    if (checked) {
      newMap.set(itemId, maxQty);
    } else {
      newMap.delete(itemId);
    }
    setReturnItems(newMap);
  };

  const handleQuantityChange = (itemId: string, qty: number, maxQty: number) => {
    if (qty < 1 || qty > maxQty) return;
    const newMap = new Map(returnItems);
    newMap.set(itemId, qty);
    setReturnItems(newMap);
  };

  const calculateRefund = () => {
    if (!selectedOrder) return 0;
    let total = 0;
    selectedOrder.items.forEach((item: OrderItem) => {
      const returnQty = returnItems.get(item.id) || 0;
      total += returnQty * item.price;
    });
    return total;
  };

  const processReturn = async () => {
    if (!selectedOrder || returnItems.size === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one item to return',
        variant: 'destructive',
      });
      return;
    }

    if (!returnReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for the return',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Build return record
      const returnedItems: ReturnRecord['items'] = [];
      for (const [itemId, qty] of returnItems.entries()) {
        const item = selectedOrder.items.find((i: OrderItem) => i.id === itemId);
        if (item) {
          returnedItems.push({
            id: item.id,
            name: item.name,
            quantity: qty,
            price: item.price,
            color: item.color,
            size: item.size,
          });
        }
      }

      // Restock inventory - try to find matching products in database
      for (const item of returnedItems) {
        // Search for product by name (partial match)
        const { data: products } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .ilike('name', `%${item.name.split('–')[0].trim()}%`)
          .limit(1);

        if (products && products.length > 0) {
          const product = products[0];
          await supabase
            .from('products')
            .update({
              stock_quantity: (product.stock_quantity || 0) + item.quantity,
              in_stock: true,
            })
            .eq('id', product.id);
        }
      }

      // Create return record
      const newReturn: ReturnRecord = {
        id: crypto.randomUUID(),
        order_id: selectedOrder.id,
        customer_name: selectedOrder.customer_name,
        items: returnedItems,
        total_refund: calculateRefund(),
        reason: returnReason,
        processed_by: 'admin',
        created_at: new Date().toISOString(),
      };

      // Save to returns history
      const updatedReturns = [newReturn, ...returns];
      await supabase
        .from('site_settings')
        .upsert({
          key: 'returns_history',
          value: JSON.stringify(updatedReturns),
          updated_at: new Date().toISOString(),
        });

      setReturns(updatedReturns);

      toast({
        title: 'Return Processed',
        description: `Return processed successfully. ${returnedItems.length} item(s) restocked.`,
      });

      setIsDialogOpen(false);
      setSelectedOrder(null);
      setReturnItems(new Map());
      setReturnReason('');
    } catch (error) {
      console.error('Return processing error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process return',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            E-Commerce Returns
          </h2>
          <p className="text-sm text-muted-foreground">
            Process returns for completed online orders. Items will be automatically restocked.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name, phone, or order ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders List */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-semibold text-muted-foreground">Completed Online Orders</h3>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No completed online orders found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredOrders.map(order => (
                <Card key={order.id} className="glass-card hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleSelectOrder(order)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {order.id.slice(0, 8)} • {format(parseISO(order.created_at), 'PPp')}
                        </p>
                        <p className="text-sm mt-2">
                          {order.items.length} item(s) • Ksh {order.total.toLocaleString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Process Return
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Returns History */}
        <div className="space-y-4">
          <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
            <History className="w-4 h-4" />
            Returns History
          </h3>
          
          {returns.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No returns processed yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {returns.map(ret => (
                <Card key={ret.id} className="glass-card border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{ret.customer_name}</p>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            Refunded
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Order: {ret.order_id.slice(0, 8)} • {format(parseISO(ret.created_at), 'PPp')}
                        </p>
                        <div className="mt-2 text-sm">
                          {ret.items.map((item, idx) => (
                            <p key={idx} className="text-muted-foreground">
                              {item.quantity}x {item.name}
                              {item.color && ` (${item.color})`}
                            </p>
                          ))}
                        </div>
                        <p className="text-sm font-semibold mt-2 text-green-400">
                          Refund: Ksh {ret.total_refund.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {ret.reason}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Return Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Process Return
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="font-semibold">{selectedOrder.customer_name}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.customer_phone}</p>
                <p className="text-xs text-muted-foreground">
                  Order ID: {selectedOrder.id.slice(0, 8)}
                </p>
              </div>

              <div className="space-y-3">
                <Label>Select items to return:</Label>
                {selectedOrder.items.map((item: OrderItem) => {
                  const isSelected = returnItems.has(item.id);
                  const returnQty = returnItems.get(item.id) || 0;

                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleToggleItem(item.id, item.quantity, !!checked)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        {item.color && (
                          <p className="text-xs text-muted-foreground">Color: {item.color}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Ksh {item.price} × {item.quantity}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Qty:</Label>
                          <Input
                            type="number"
                            min={1}
                            max={item.quantity}
                            value={returnQty}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1, item.quantity)}
                            className="w-16 h-8"
                          />
                          <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for return *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for this return..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>

              {returnItems.size > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Refund:</span>
                      <span className="text-xl font-bold text-primary">
                        Ksh {calculateRefund().toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {returnItems.size} item(s) will be restocked automatically
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-yellow-500">
                  This action cannot be undone. Inventory will be updated immediately.
                </p>
              </div>

              <Button
                onClick={processReturn}
                disabled={isProcessing || returnItems.size === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Confirm Return & Restock
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsManager;
