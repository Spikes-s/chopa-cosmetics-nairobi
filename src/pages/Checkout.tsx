import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, Truck, MapPin, Loader2 } from 'lucide-react';
import DeliveryLocationSelect, { DELIVERY_LOCATIONS } from '@/components/DeliveryLocationSelect';

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, totalWithWholesale, clearCart } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryLocation, setDeliveryLocation] = useState('cbd');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pickupDate: '',
    pickupTime: '',
    notes: '',
    mpesaCode: '',
  });
  const [hasPaid, setHasPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedLocation = DELIVERY_LOCATIONS.find(l => l.id === deliveryLocation);
  const deliveryFee = deliveryMethod === 'delivery' ? (selectedLocation?.price || 0) : 0;
  const totalWithDelivery = totalWithWholesale + deliveryFee;

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPaid) {
      toast.error('Please confirm your payment before submitting');
      return;
    }

    if (!formData.mpesaCode.trim()) {
      toast.error('Please enter your M-Pesa transaction code');
      return;
    }

    // Client-side phone validation (Kenyan format)
    const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      toast.error('Please enter a valid Kenyan phone number (e.g., 0712345678)');
      return;
    }

    if (isSubmitting) return; // Prevent duplicate submissions
    setIsSubmitting(true);

    try {
      // Prepare order items with full details for server processing
      const orderItems = items.map(item => ({
        id: item.id,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
        wholesalePrice: item.wholesalePrice,
        color: item.color,
        size: item.size,
        image: item.image,
      }));

      console.log('Submitting order with items:', orderItems);

      // Call secure edge function for server-side validation and order creation
      const { data: result, error } = await supabase.functions.invoke('validate-order', {
        body: {
          user_id: user?.id || null,
          customer_name: formData.name.trim(),
          customer_phone: formData.phone.trim(),
          customer_email: formData.email.trim() || undefined,
          items: orderItems,
          mpesa_code: formData.mpesaCode.trim(),
          delivery_type: deliveryMethod,
          delivery_address: deliveryMethod === 'delivery' ? `${selectedLocation?.name} - ${formData.address}` : undefined,
          delivery_fee: deliveryFee,
          pickup_date: deliveryMethod === 'pickup' ? formData.pickupDate : undefined,
          pickup_time: deliveryMethod === 'pickup' ? formData.pickupTime : undefined,
        },
      });

      console.log('Order response:', result, error);

      if (error) {
        console.error('Order submission error:', error);
        toast.error(error.message || 'Failed to submit order. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (!result.success) {
        console.error('Order validation error:', result.error);
        toast.error(result.error || 'Failed to validate order. Please try again.');
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

      toast.success('Order submitted successfully! We will contact you shortly.', {
        position: 'top-center',
        style: {
          background: '#22c55e',
          color: 'white',
          border: 'none',
        },
      });
      clearCart();
      navigate('/');
    } catch (err) {
      console.error('Order submission error:', err);
      toast.error('Failed to submit order. Please try again.');
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

            {/* Payment */}
            <Card variant="gradient">
              <CardHeader>
                <CardTitle className="text-xl">Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    M-Pesa – Buy Goods & Services
                  </h3>
                  <p className="text-3xl font-bold text-accent mb-4">
                    Till Number: 4623226
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Please pay the exact amount shown in the order summary, then enter your transaction code below.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <Label htmlFor="mpesaCode">M-Pesa Transaction Code</Label>
                    <Input
                      id="mpesaCode"
                      value={formData.mpesaCode}
                      onChange={(e) => setFormData({ ...formData, mpesaCode: e.target.value.toUpperCase() })}
                      placeholder="e.g., SJK7XXXXXX"
                      className="uppercase"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the transaction code from your M-Pesa confirmation message
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

            <Button
              type="submit"
              variant="gradient"
              size="xl"
              className="w-full"
              disabled={!hasPaid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Order'
              )}
            </Button>
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
                {deliveryMethod === 'delivery' && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-muted-foreground">Delivery ({selectedLocation?.name.replace(' (Free Delivery)', '')})</span>
                    <span className={deliveryFee === 0 ? 'text-accent font-medium' : 'text-foreground'}>
                      {deliveryFee === 0 ? 'FREE' : `Ksh ${deliveryFee.toLocaleString()}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-lg font-semibold text-foreground">Total</span>
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
    </div>
  );
};

export default Checkout;
