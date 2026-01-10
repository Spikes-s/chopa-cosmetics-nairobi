import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import DeliveryLocationSelect, { DELIVERY_LOCATIONS } from '@/components/DeliveryLocationSelect';

const Cart = () => {
  const { items, removeItem, updateQuantity, totalWithWholesale, clearCart, getItemWholesaleThreshold } = useCart();
  const [deliveryLocation, setDeliveryLocation] = useState('cbd');
  
  const selectedLocation = DELIVERY_LOCATIONS.find(l => l.id === deliveryLocation);
  const deliveryFee = selectedLocation?.price || 0;
  const totalWithDelivery = totalWithWholesale + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">
          Your Cart is Empty
        </h1>
        <p className="text-muted-foreground mb-8">
          Start shopping to add items to your cart
        </p>
        <Button asChild variant="gradient" size="lg">
          <Link to="/products">
            Browse Products
          </Link>
        </Button>
      </div>
    );
  }

  const getItemPrice = (item: typeof items[0]) => {
    const wholesaleThreshold = getItemWholesaleThreshold(item);
    
    if (item.quantity >= wholesaleThreshold && item.wholesalePrice > 0) {
      return item.wholesalePrice;
    }
    return item.price;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Shopping Cart
        </h1>
        <Button variant="ghost" onClick={clearCart} className="text-destructive hover:text-destructive">
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const currentPrice = getItemPrice(item);
            const wholesaleThreshold = getItemWholesaleThreshold(item);
            const isWholesale = item.quantity >= wholesaleThreshold && item.wholesalePrice > 0;

            return (
              <Card key={item.id} variant="glass">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img
                        src={item.image || '/placeholder.svg'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {item.name}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                        {item.size && <span>Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-bold text-foreground">
                          Ksh {currentPrice.toLocaleString()}
                        </span>
                        {isWholesale && (
                          <>
                            <span className="text-sm text-muted-foreground line-through">
                              Ksh {item.price.toLocaleString()}
                            </span>
                            <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded">
                              Wholesale
                            </span>
                          </>
                        )}
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {!isWholesale && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Add {wholesaleThreshold - item.quantity} more for wholesale price
                        </p>
                      )}
                    </div>

                    {/* Item Total */}
                    <div className="text-right shrink-0">
                      <span className="font-bold text-lg gradient-text">
                        Ksh {(currentPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card variant="gradient" className="sticky top-24">
            <CardContent className="p-6">
              <h2 className="text-xl font-display font-bold text-foreground mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span>
                  <span>Ksh {totalWithWholesale.toLocaleString()}</span>
                </div>
                
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Delivery Location</p>
                  <DeliveryLocationSelect 
                    value={deliveryLocation} 
                    onChange={setDeliveryLocation} 
                  />
                </div>

                <div className="flex justify-between text-muted-foreground pt-2">
                  <span>Delivery Fee</span>
                  <span className={deliveryFee === 0 ? 'text-accent font-medium' : ''}>
                    {deliveryFee === 0 ? 'FREE' : `Ksh ${deliveryFee.toLocaleString()}`}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold gradient-text">
                    Ksh {totalWithDelivery.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button asChild variant="gradient" size="lg" className="w-full">
                <Link to="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>

              {/* Payment Info */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold text-foreground text-sm mb-2">
                  Payment Method
                </h3>
                <p className="text-sm text-muted-foreground">
                  M-Pesa – Buy Goods & Services
                </p>
                <p className="text-lg font-bold text-accent">
                  Till Number: 4623226
                </p>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Cart;
