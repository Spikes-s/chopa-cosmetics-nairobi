import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, Truck, MapPin } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalWithWholesale, clearCart } = useCart();
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    pickupDate: '',
    pickupTime: '',
    notes: '',
  });
  const [hasPaid, setHasPaid] = useState(false);

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasPaid) {
      toast.error('Please confirm your payment before submitting');
      return;
    }

    // Here you would submit the order to your backend
    toast.success('Order submitted successfully! We will contact you shortly.');
    clearCart();
    navigate('/');
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
                        Free delivery within the Central Business District (CBD)
                      </p>
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
                      <Label htmlFor="address">Delivery Address</Label>
                      <Textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter your full delivery address"
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
                    Please pay the exact amount shown in the order summary, then click "I Have Paid" below.
                  </p>
                </div>

                <Button
                  type="button"
                  variant={hasPaid ? 'gold' : 'outline'}
                  className="w-full"
                  onClick={() => setHasPaid(!hasPaid)}
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
              disabled={!hasPaid}
            >
              Submit Order
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
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">
                    Ksh {totalWithWholesale.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold gradient-text">
                    Ksh {totalWithWholesale.toLocaleString()}
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
