import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, Truck, MapPin, FileText, Wallet as WalletIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import ProcessingOverlay from '@/components/ProcessingOverlay';
import DeliveryLocationSelect from '@/components/DeliveryLocationSelect';
import { findLocation } from '@/data/deliveryLocations';


const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalWithWholesale, clearCart } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryLocation, setDeliveryLocation] = useState('cbd');
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    address: string;
    pickupDate: string;
    pickupTime: string;
    notes: string;
    mpesaCode: string;
    mpesaPhone: string;
    mpesaScreenshot?: File;
  }>({
    name: '',
    phone: '',
    email: '',
    address: '',
    pickupDate: '',
    pickupTime: '',
    notes: '',
    mpesaCode: '',
    mpesaPhone: '',
  });
  const [hasPaid, setHasPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderOverlay, setOrderOverlay] = useState<{ open: boolean; status: 'processing' | 'success' | 'error'; message: string }>({
    open: false, status: 'processing', message: ''
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid' | 'expired' | 'used'; discount?: number; code?: string; message?: string }>({ status: 'idle' });
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [applyWallet, setApplyWallet] = useState(true);

  useEffect(() => {
    if (!user) { setWalletBalance(0); return; }
    supabase
      .from('customer_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setWalletBalance(Number(data?.balance || 0)));
  }, [user]);

  const discountAmount = couponState.status === 'valid' && couponState.discount
    ? Math.round((totalWithWholesale * couponState.discount) / 100)
    : 0;
  const grossTotal = Math.max(0, totalWithWholesale - discountAmount);
  const walletApplied = applyWallet ? Math.min(walletBalance, grossTotal) : 0;
  const totalWithDelivery = Math.max(0, grossTotal - walletApplied);


  const checkCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setValidatingCoupon(true);
    setCouponState({ status: 'checking' });
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        _code: code,
        _email: formData.email.trim() || (user?.email ?? null),
      });
      if (error) throw error;
      const res = data as any;
      if (res?.valid) {
        setCouponState({ status: 'valid', discount: Number(res.discount_percent), code: res.code });
        toast.success(`Coupon applied — ${res.discount_percent}% off`);
      } else {
        const reason = res?.reason as string;
        if (reason === 'expired') setCouponState({ status: 'expired', message: 'This coupon has expired.' });
        else if (reason === 'already_used') setCouponState({ status: 'used', message: 'This coupon has already been used.' });
        else setCouponState({ status: 'invalid', message: 'Invalid coupon code.' });
      }
    } catch (e: any) {
      setCouponState({ status: 'invalid', message: e?.message || 'Could not validate coupon.' });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const clearCoupon = () => { setCouponCode(''); setCouponState({ status: 'idle' }); };


  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  // Categorize errors for friendlier UI messaging
  const categorizeError = (msg: string): { title: string; message: string } => {
    const m = (msg || '').toLowerCase();
    if (m.includes('network') || m.includes('failed to fetch') || m.includes('timeout')) {
      return { title: 'Network Error', message: 'We could not reach our servers. Please check your internet connection and try again.' };
    }
    if (m.includes('stock') || m.includes('unavailable') || m.includes('quantities')) {
      return { title: 'Inventory Error', message: msg || 'Some items in your cart are no longer available. Please adjust quantities and try again.' };
    }
    if (m.includes('mpesa') || m.includes('m-pesa') || m.includes('payment') || m.includes('transaction code')) {
      return { title: 'Payment Error', message: msg || 'There was a problem with the payment details. Please double-check your M-Pesa transaction code.' };
    }
    if (m.includes('phone') || m.includes('email') || m.includes('name') || m.includes('address') || m.includes('invalid') || m.includes('required')) {
      return { title: 'Validation Error', message: msg || 'Some details are missing or invalid. Please review the form and try again.' };
    }
    if (m.includes('rate limit')) {
      return { title: 'Too Many Attempts', message: 'You have placed many orders recently. Please wait a few minutes and try again.' };
    }
    return { title: 'Order Failed', message: msg || 'Something went wrong. Please try again in a moment.' };
  };

  const walletCoversAll = totalWithDelivery === 0 && walletApplied > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletCoversAll) {
      if (!hasPaid) {
        toast.error('Please confirm your payment before submitting');
        return;
      }
      if (!formData.mpesaCode.trim()) {
        toast.error('Please enter your M-Pesa transaction code');
        return;
      }
    }

    // Client-side phone validation (Kenyan format)
    const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setOrderOverlay({ open: true, status: 'processing', message: 'Placing your order…' });

    try {
      const orderItems = items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        wholesalePrice: item.wholesalePrice,
        color: item.color,
        size: item.size,
        variant: item.variant,
        image: item.image,
      }));

      const { data: result, error } = await supabase.functions.invoke('validate-order', {
        body: {
          user_id: user?.id || null,
          customer_name: formData.name.trim(),
          customer_phone: formData.phone.trim(),
          customer_email: formData.email.trim() || undefined,
          items: orderItems,
          mpesa_code: walletCoversAll ? 'WALLET' : formData.mpesaCode.trim(),
          delivery_type: deliveryMethod,
          delivery_address: deliveryMethod === 'delivery' ? `${findLocation(deliveryLocation)?.name || deliveryLocation} - ${formData.address}` : undefined,
          delivery_fee: 0,
          pickup_date: deliveryMethod === 'pickup' ? formData.pickupDate : undefined,
          pickup_time: deliveryMethod === 'pickup' ? formData.pickupTime : undefined,
          apply_wallet: applyWallet && user != null,
        },
      });


      // supabase-js sets `error` on non-2xx but still parses `data` when the body is JSON.
      // Prefer the structured server message over the generic "non-2xx status code".
      const serverMessage = (result as any)?.error || (result as any)?.message;

      if (error || !(result as any)?.success) {
        const raw = serverMessage || error?.message || 'Failed to submit order. Please try again.';
        const { title, message } = categorizeError(raw);
        setOrderOverlay({ open: true, status: 'error', message: `${title}: ${message}` });
        setIsSubmitting(false);
        return;
      }

      // Store order token for guest order tracking
      if (result.order_token) {
        const existingTokens = JSON.parse(sessionStorage.getItem('order_tokens') || '[]');
        existingTokens.push({
          orderId: result.order.id,
          token: result.order_token,
          createdAt: new Date().toISOString()
        });
        sessionStorage.setItem('order_tokens', JSON.stringify(existingTokens));
      }

      // Redeem the coupon (best-effort; failure is non-blocking)
      if (couponState.status === 'valid' && couponState.code) {
        try {
          await supabase.rpc('redeem_coupon', {
            _code: couponState.code,
            _email: formData.email.trim() || user?.email || '',
            _order_id: result.order?.id || null,
            _discount_amount: discountAmount,
          });
        } catch (e) {
          console.warn('Coupon redemption failed:', e);
        }
      }

      setOrderOverlay({ open: true, status: 'success', message: 'Order placed successfully! 🎉' });

      setTimeout(() => {
        clearCart();
        navigate('/order-success', {
          state: {
            orderId: result.order.id,
            orderToken: result.order_token,
            receiptNumber: result.order.receipt_number,
            customerName: formData.name.trim(),
            total: totalWithDelivery,
            deliveryType: deliveryMethod,
            itemCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
          },
        });
      }, 1500);
    } catch (err: any) {
      console.error('Order submission error:', err);
      const { title, message } = categorizeError(err?.message || 'Network error');
      setOrderOverlay({ open: true, status: 'error', message: `${title}: ${message}` });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold text-foreground mb-8">
        Checkout
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Info */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-xl">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 0712345678"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Delivery Method */}
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-xl">Delivery Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={deliveryMethod}
                  onValueChange={(value) => setDeliveryMethod(value as 'delivery' | 'pickup')}
                  className="space-y-4"
                >
                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <div className="flex-1">
                      <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer">
                        <Truck className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Delivery</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        We deliver across Nairobi and beyond
                      </p>
                      <div className="mt-2 p-2 rounded bg-accent/10 border border-accent/20">
                        <p className="text-xs text-accent font-medium">
                          🎁 FREE Delivery for:
                        </p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <li>• CBD areas (Nairobi Central)</li>
                          <li>• Orders above Ksh 50,000</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <div className="flex-1">
                      <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer">
                        <MapPin className="w-5 h-5 text-primary" />
                        <span className="font-semibold">Store Pickup</span>
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pick up from our store at KAKA HOUSE
                      </p>
                    </div>
                  </div>
                </RadioGroup>

                {/* Delivery Details */}
                {deliveryMethod === 'delivery' && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Delivery Location</Label>
                      <DeliveryLocationSelect 
                        value={deliveryLocation} 
                        onChange={setDeliveryLocation} 
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Detailed Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Building name, floor, street, landmarks..."
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Pickup Details */}
                {deliveryMethod === 'pickup' && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="pickupDate">Pickup Date</Label>
                        <Input
                          id="pickupDate"
                          type="date"
                          value={formData.pickupDate}
                          onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="pickupTime">Preferred Time</Label>
                        <Input
                          id="pickupTime"
                          type="time"
                          value={formData.pickupTime}
                          onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Opening hours: 7:30 AM – 9:00 PM
                    </p>
                  </div>
                )}

                {/* Additional Notes */}
                <div className="mt-6">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment - Manual Only */}
            {/* Payment - Manual Only (skipped when wallet covers full total) */}
            {!walletCoversAll && (
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Payment via M-Pesa
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Step-by-step instructions */}
                <div className="bg-muted/50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-foreground mb-3">
                    How to Pay
                  </h3>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open <span className="font-semibold text-foreground">M-Pesa</span> on your phone</li>
                    <li>Select <span className="font-semibold text-foreground">Lipa na M-Pesa</span></li>
                    <li>Select <span className="font-semibold text-foreground">Buy Goods and Services</span></li>
                    <li>Enter Till Number: <span className="font-bold text-accent text-lg">4623226</span></li>
                    <li>Enter Amount: <span className="font-semibold text-foreground">Ksh {totalWithDelivery.toLocaleString()}</span></li>
                    <li>Enter your <span className="font-semibold text-foreground">M-Pesa PIN</span> and confirm</li>
                    <li>Enter the transaction code below</li>
                  </ol>
                </div>

                <div className="bg-primary/5 rounded-lg p-4 mb-6 text-center border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">
                    Business Name: <span className="font-semibold text-foreground">Chopa Cosmetics Ltd</span>
                  </p>
                  <p className="text-3xl font-bold text-accent">
                    Till: 4623226
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Amount: <span className="font-semibold text-foreground">Ksh {totalWithDelivery.toLocaleString()}</span>
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="mpesaPhone">Phone Number Used for Payment</Label>
                    <Input
                      id="mpesaPhone"
                      type="tel"
                      value={formData.mpesaPhone || ''}
                      onChange={(e) => setFormData({ ...formData, mpesaPhone: e.target.value })}
                      placeholder="e.g., 0712345678"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mpesaCode">M-Pesa Transaction Code *</Label>
                    <Input
                      id="mpesaCode"
                      value={formData.mpesaCode}
                      onChange={(e) => setFormData({ ...formData, mpesaCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SJK7XXXXXX"
                      className="font-mono tracking-wider"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mpesaScreenshot">Payment Screenshot (Optional)</Label>
                    <Input
                      id="mpesaScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 5 * 1024 * 1024) {
                          toast.error('File must be under 5MB');
                          e.target.value = '';
                          return;
                        }
                        setFormData({ ...formData, mpesaScreenshot: file || undefined });
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a screenshot of your M-Pesa confirmation (max 5MB)
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={hasPaid ? 'gold' : 'outline'}
                  className="w-full"
                  onClick={() => setHasPaid(!hasPaid)}
                  disabled={!formData.mpesaCode.trim()}
                >
                  {hasPaid ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Payment Confirmed
                    </>
                  ) : (
                    'I Have Paid'
                  )}
                </Button>
              </CardContent>
            </Card>

            <LoadingButton
              type="submit"
              variant="gradient"
              size="xl"
              className="w-full"
              disabled={!hasPaid}
              loading={isSubmitting}
              loadingText="Placing your order…"
            >
              Submit Order
            </LoadingButton>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card variant="glass" className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    Ksh {totalWithWholesale.toLocaleString()}
                  </span>
                </div>

                {/* VIP Coupon */}
                <div className="mb-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="VIP coupon code"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if (couponState.status !== 'idle') setCouponState({ status: 'idle' }); }}
                      maxLength={40}
                      className="h-9"
                    />
                    {couponState.status === 'valid' ? (
                      <Button type="button" variant="outline" size="sm" onClick={clearCoupon}>Remove</Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={checkCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                        {validatingCoupon ? '…' : 'Apply'}
                      </Button>
                    )}
                  </div>
                  {couponState.status === 'valid' && (
                    <p className="text-xs text-green-600 mt-1">✓ Coupon Applied — {couponState.discount}% off</p>
                  )}
                  {couponState.status === 'expired' && (
                    <p className="text-xs text-destructive mt-1">✕ Coupon Expired</p>
                  )}
                  {couponState.status === 'invalid' && (
                    <p className="text-xs text-destructive mt-1">✕ Invalid Coupon</p>
                  )}
                  {couponState.status === 'used' && (
                    <p className="text-xs text-destructive mt-1">✕ This coupon has already been used.</p>
                  )}
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center mb-2 text-green-600">
                    <span>Discount ({couponState.discount}%)</span>
                    <span>− Ksh {discountAmount.toLocaleString()}</span>
                  </div>
                )}

                {deliveryMethod === 'delivery' && (findLocation(deliveryLocation)?.price ?? 1) > 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 mb-2">
                    <span className="text-lg">👉</span>
                    <p className="text-sm font-medium text-warning">
                      Delivery fee will be paid directly to the driver upon delivery.
                    </p>
                  </div>
                )}

                {user && walletBalance > 0 && (
                  <div className="mt-2 mb-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <WalletIcon className="w-4 h-4 text-accent" />
                        <span className="text-foreground">Wallet Balance</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">Ksh {walletBalance.toLocaleString()}</span>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={applyWallet}
                        onChange={(e) => setApplyWallet(e.target.checked)}
                        className="rounded"
                      />
                      <span>Apply wallet balance to this order</span>
                    </label>
                    {applyWallet && walletApplied > 0 && (
                      <div className="flex justify-between text-xs text-green-600 mt-2">
                        <span>Wallet Applied</span>
                        <span>− Ksh {walletApplied.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-lg font-semibold text-foreground">Amount Due</span>
                  <span className="text-2xl font-bold gradient-text">
                    Ksh {totalWithDelivery.toLocaleString()}
                  </span>
                </div>
              </div>


              {totalWithWholesale >= 50000 && (
                <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm text-accent font-medium">
                    🎁 You qualify for free rewards!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      <ProcessingOverlay
        isOpen={orderOverlay.open}
        status={orderOverlay.status}
        title={
          orderOverlay.status === 'processing' ? 'Placing Your Order…' :
          orderOverlay.status === 'success' ? 'Order Placed!' :
          'Order Failed'
        }
        message={orderOverlay.message}
        onClose={() => setOrderOverlay({ ...orderOverlay, open: false })}
        onRetry={orderOverlay.status === 'error' ? () => setOrderOverlay({ ...orderOverlay, open: false }) : undefined}
      />
    </div>
  );
};

export default Checkout;
