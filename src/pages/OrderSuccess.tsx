import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, Copy, ArrowRight, Home } from 'lucide-react';
import { toast } from 'sonner';

interface OrderSuccessState {
  orderId: string;
  customerName: string;
  total: number;
  deliveryType: string;
  itemCount: number;
}

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderData = location.state as OrderSuccessState | null;
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!orderData) {
      navigate('/');
      return;
    }
    // Staggered animation
    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, [orderData, navigate]);

  if (!orderData) return null;

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderData.orderId);
    toast.success('Order ID copied!');
  };

  const shortId = orderData.orderId.slice(0, 8).toUpperCase();

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center animate-bounce-in">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 animate-fade-in">
          Order Placed! 🎉
        </h1>
        <p className="text-muted-foreground animate-fade-in">
          Thank you, {orderData.customerName}! Your order has been received.
        </p>
      </div>

      <div className={`transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Card variant="gradient" className="mb-6">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl font-bold font-mono text-foreground tracking-wider">
                #{shortId}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyOrderId}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-semibold text-foreground">{orderData.itemCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold gradient-text">Ksh {orderData.total.toLocaleString()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">
                  {orderData.deliveryType === 'delivery' ? '🚚 Delivery' : '📍 Store Pickup'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">What happens next?</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                  <li>We verify your payment</li>
                  <li>Your order is prepared</li>
                  <li>
                    {orderData.deliveryType === 'delivery'
                      ? 'Delivered to your location'
                      : 'Ready for pickup at KAKA HOUSE'}
                  </li>
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">
                  Track your order in{' '}
                  <Link to="/my-orders" className="text-primary underline">My Orders</Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button asChild variant="gradient" size="lg" className="w-full">
            <Link to="/my-orders">
              Track My Order
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Continue Shopping
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
