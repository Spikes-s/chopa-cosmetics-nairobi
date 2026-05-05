import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { printReceipt as printReceiptUtil } from '@/lib/receipt';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Banknote,
  Receipt,
  X,
  Grid3X3,
  List,
  Percent,
  Calculator,
  Printer,
  Check,
  Image
} from 'lucide-react';
import { categories } from '@/data/products';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  image_url: string | null;
  stock_quantity: number | null;
  in_stock: boolean | null;
  barcode: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  priceType: 'retail' | 'wholesale';
}

const POSSystem = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Discount state
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('');
  
  // Tax state
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState<string>('16');
  
  // Payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Receipt state
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, subcategory, retail_price, wholesale_price, wholesale_min_qty, image_url, stock_quantity, in_stock, barcode')
        .eq('in_stock', true)
        .order('name');

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load products',
          variant: 'destructive',
        });
      } else {
        setProducts(data || []);
      }
      setIsLoading(false);
    };

    fetchProducts();

    // Set up realtime subscription for products
    const channel = supabase
      .channel('pos-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add to cart
  const addToCart = (product: Product) => {
    if ((product.stock_quantity ?? 0) <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently unavailable',
        variant: 'destructive',
      });
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Check stock
        if (existingItem.quantity >= (product.stock_quantity ?? 0)) {
          toast({
            title: 'Stock Limit',
            description: `Only ${product.stock_quantity} available`,
            variant: 'destructive',
          });
          return prevCart;
        }
        
        return prevCart.map(item => {
          if (item.product.id === product.id) {
            const newQuantity = item.quantity + 1;
            const priceType = getPriceType(product, newQuantity);
            const price = priceType === 'wholesale' && product.wholesale_price 
              ? product.wholesale_price 
              : product.retail_price;
            
            return { ...item, quantity: newQuantity, price, priceType };
          }
          return item;
        });
      } else {
        const priceType = getPriceType(product, 1);
        const price = priceType === 'wholesale' && product.wholesale_price 
          ? product.wholesale_price 
          : product.retail_price;
        
        return [...prevCart, { product, quantity: 1, price, priceType }];
      }
    });
  };

  // Get price type based on quantity
  const getPriceType = (product: Product, quantity: number): 'retail' | 'wholesale' => {
    if (!product.wholesale_price || !product.wholesale_min_qty) return 'retail';
    return quantity >= product.wholesale_min_qty ? 'wholesale' : 'retail';
  };

  // Update cart quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.product.id === productId) {
          const newQuantity = Math.max(0, item.quantity + delta);
          
          if (newQuantity === 0) {
            return null;
          }
          
          if (newQuantity > (item.product.stock_quantity ?? 0)) {
            toast({
              title: 'Stock Limit',
              description: `Only ${item.product.stock_quantity} available`,
              variant: 'destructive',
            });
            return item;
          }
          
          const priceType = getPriceType(item.product, newQuantity);
          const price = priceType === 'wholesale' && item.product.wholesale_price 
            ? item.product.wholesale_price 
            : item.product.retail_price;
          
          return { ...item, quantity: newQuantity, price, priceType };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setDiscountValue('');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  // Calculate totals
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!discountValue || parseFloat(discountValue) <= 0) return 0;
    
    if (discountType === 'percentage') {
      return subtotal * (parseFloat(discountValue) / 100);
    }
    return parseFloat(discountValue);
  }, [subtotal, discountType, discountValue]);

  const afterDiscount = subtotal - discountAmount;

  const taxAmount = useMemo(() => {
    if (!taxEnabled) return 0;
    return afterDiscount * (parseFloat(taxRate) / 100);
  }, [afterDiscount, taxEnabled, taxRate]);

  const total = afterDiscount + taxAmount;

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash' || !cashReceived) return 0;
    return Math.max(0, parseFloat(cashReceived) - total);
  }, [paymentMethod, cashReceived, total]);

  // Process payment
  const processPayment = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Add items to the cart before checkout',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(cashReceived) < total) {
      toast({
        title: 'Insufficient Amount',
        description: 'Cash received is less than the total',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaCode.trim()) {
      toast({
        title: 'M-Pesa Code Required',
        description: 'Please enter the M-Pesa transaction code',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create order
      const orderItems = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        priceType: item.priceType,
        subtotal: item.price * item.quantity,
      }));

      const orderData = {
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: customerPhone || 'N/A',
        delivery_type: 'pickup',
        items: orderItems,
        subtotal,
        discount_amount: discountAmount,
        discount_type: discountValue ? discountType : null,
        tax_amount: taxAmount,
        total,
        payment_status: 'confirmed',
        order_status: 'completed',
        sales_channel: 'pos',
        payment_method: paymentMethod,
        mpesa_code: paymentMethod === 'mpesa' ? mpesaCode : null,
        change_given: paymentMethod === 'cash' ? changeAmount : 0,
        cashier_id: user?.id,
        status_history: [{
          status: 'completed',
          timestamp: new Date().toISOString(),
          note: `POS Sale - ${paymentMethod.toUpperCase()}`
        }],
      };

      const { data: order, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Reduce stock for each item
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: Math.max(0, (item.product.stock_quantity ?? 0) - item.quantity),
            in_stock: ((item.product.stock_quantity ?? 0) - item.quantity) > 0
          })
          .eq('id', item.product.id);

        if (stockError) {
          console.error('Stock update error:', stockError);
        }
      }

      // Set last order for receipt
      setLastOrder({
        ...order,
        items: orderItems,
        cashReceived: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        changeGiven: paymentMethod === 'cash' ? changeAmount : 0,
      });

      toast({
        title: 'Sale Complete',
        description: `Order processed successfully - ${order.receipt_number || order.id.slice(0, 8)}`,
      });

      // Show receipt
      setShowPaymentDialog(false);
      setShowReceiptDialog(true);
      
      // Clear cart
      clearCart();
      setCashReceived('');
      setMpesaCode('');

    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process payment',
        variant: 'destructive',
      });
    }
  };

  // Print receipt using the shared receipt utility
  const handlePrintReceipt = () => {
    if (!lastOrder) return;
    printReceiptUtil(lastOrder);
  };

  // Quick cash buttons
  const quickCashAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-4">
      {/* Products Panel */}
      <div className="flex-1 flex flex-col bg-card rounded-lg border overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search by name, barcode, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={selectedCategory === cat.name ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.name)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid/List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products found
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-3 bg-background rounded-lg border hover:border-primary hover:shadow-md transition-all text-left"
                  disabled={(product.stock_quantity ?? 0) <= 0}
                >
                  <div className="w-full h-20 mb-2 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-primary">Ksh {product.retail_price}</span>
                    {(product.stock_quantity ?? 0) <= 5 && (
                      <Badge variant="secondary" className="text-xs">
                        {product.stock_quantity} left
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full p-3 bg-background rounded-lg border hover:border-primary hover:shadow-md transition-all flex items-center gap-3"
                  disabled={(product.stock_quantity ?? 0) <= 0}
                >
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category} • Stock: {product.stock_quantity}</p>
                  </div>
                  <span className="font-bold text-primary">Ksh {product.retail_price}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-96 flex flex-col bg-card rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            <h3 className="font-semibold">Cart ({cart.length})</h3>
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Cart is empty</p>
              <p className="text-sm">Click products to add</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="bg-background p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm">Ksh {item.price}</span>
                      {item.priceType === 'wholesale' && (
                        <Badge variant="secondary" className="text-xs">Wholesale</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <span className="font-bold">Ksh {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount Section */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Discount</span>
            </div>
            <div className="flex gap-2">
              <Select value={discountType} onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">Ksh</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="p-4 border-t bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>Ksh {subtotal.toLocaleString()}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-Ksh {discountAmount.toLocaleString()}</span>
            </div>
          )}
          {taxEnabled && (
            <div className="flex justify-between text-sm">
              <span>Tax ({taxRate}%)</span>
              <span>Ksh {taxAmount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">Ksh {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Buttons */}
        <div className="p-4 border-t grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setPaymentMethod('cash');
              setShowPaymentDialog(true);
            }}
            disabled={cart.length === 0}
          >
            <Banknote className="w-4 h-4" />
            Cash
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              setPaymentMethod('mpesa');
              setShowPaymentDialog(true);
            }}
            disabled={cart.length === 0}
          >
            <CreditCard className="w-4 h-4" />
            M-Pesa
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentMethod === 'cash' ? (
                <>
                  <Banknote className="w-5 h-5" />
                  Cash Payment
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  M-Pesa Payment
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Customer Info */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Walk-in Customer"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone (Optional)</label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                />
              </div>
            </div>

            {/* Total Display */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-primary">Ksh {total.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>

            {paymentMethod === 'cash' ? (
              <>
                {/* Cash Received */}
                <div>
                  <label className="text-sm font-medium">Cash Received</label>
                  <Input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter amount"
                    className="text-xl font-bold text-center"
                  />
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  {quickCashAmounts.map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      onClick={() => setCashReceived(amount.toString())}
                    >
                      {amount.toLocaleString()}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => setCashReceived(Math.ceil(total / 100) * 100 + '')}
                  >
                    Round Up
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCashReceived(total.toString())}
                    className="col-span-2"
                  >
                    Exact
                  </Button>
                </div>

                {/* Change Display */}
                {parseFloat(cashReceived) >= total && (
                  <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-green-700 dark:text-green-300">Change to Give</p>
                        <p className="text-2xl font-bold text-green-600">Ksh {changeAmount.toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <>
                {/* M-Pesa Code */}
                <div>
                  <label className="text-sm font-medium">M-Pesa Transaction Code</label>
                  <Input
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123XYZ"
                    className="text-xl font-bold text-center uppercase"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Till Number: 4623226
                  </p>
                </div>
              </>
            )}

            {/* Complete Button */}
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={processPayment}
              disabled={
                cart.length === 0 ||
                (paymentMethod === 'cash' && parseFloat(cashReceived) < total) ||
                (paymentMethod === 'mpesa' && !mpesaCode.trim())
              }
            >
              <Check className="w-5 h-5" />
              Complete Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-sm print:max-w-full print:shadow-none print:border-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Receipt
            </DialogTitle>
          </DialogHeader>

          {lastOrder && (
            <div className="space-y-4 text-sm print:text-xs print:space-y-2" id="receipt">
              {/* Header */}
              <div className="text-center border-b pb-3">
                <h3 className="font-bold text-lg">CHOPA BEAUTY</h3>
                <p className="text-muted-foreground">Point of Sale Receipt</p>
                <p className="text-xs mt-2">
                  {format(new Date(lastOrder.created_at), 'PPpp')}
                </p>
                {lastOrder.receipt_number && (
                  <p className="font-mono mt-1">{lastOrder.receipt_number}</p>
                )}
              </div>

              {/* Customer */}
              <div className="border-b pb-3">
                <p><span className="text-muted-foreground">Customer:</span> {lastOrder.customer_name}</p>
                {lastOrder.customer_phone !== 'N/A' && (
                  <p><span className="text-muted-foreground">Phone:</span> {lastOrder.customer_phone}</p>
                )}
              </div>

              {/* Items */}
              <div className="border-b pb-3 space-y-2">
                {lastOrder.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <span>{item.name}</span>
                      <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                    </div>
                    <span>Ksh {item.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>Ksh {lastOrder.subtotal.toLocaleString()}</span>
                </div>
                {lastOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-Ksh {lastOrder.discount_amount.toLocaleString()}</span>
                  </div>
                )}
                {lastOrder.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>Ksh {lastOrder.tax_amount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>Ksh {lastOrder.total.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="font-medium">{lastOrder.payment_method?.toUpperCase()}</span>
                </div>
                {lastOrder.cashReceived && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Received</span>
                      <span>Ksh {lastOrder.cashReceived.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span>Ksh {lastOrder.changeGiven.toLocaleString()}</span>
                    </div>
                  </>
                )}
                {lastOrder.mpesa_code && (
                  <div className="flex justify-between">
                    <span>M-Pesa Code</span>
                    <span className="font-mono">{lastOrder.mpesa_code}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-center pt-3 border-t text-muted-foreground">
                <p>Thank you for shopping with us!</p>
                <p className="text-xs mt-1">Contact: +254 XXX XXXX</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4 print:hidden">
            <Button variant="outline" className="flex-1 gap-2" onClick={printReceipt}>
              <Printer className="w-4 h-4" />
              Print Receipt
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1 gap-2" 
              onClick={() => {
                const receiptContent = document.getElementById('receipt');
                if (receiptContent) {
                  const blob = new Blob([receiptContent.outerHTML], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `receipt-${lastOrder?.receipt_number || lastOrder?.id?.slice(0, 8)}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
            >
              Save PDF
            </Button>
          </div>
          <Button className="w-full print:hidden" onClick={() => setShowReceiptDialog(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSSystem;
