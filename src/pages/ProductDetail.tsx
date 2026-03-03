import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { ShoppingCart, Minus, Plus, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import ProductReviews from '@/components/ProductReviews';

interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  additional_images: string[] | null;
  in_stock: boolean | null;
  variations: any;
}

interface CustomColor {
  name: string;
  hex: string;
  hex2?: string;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, addViewedProduct } = useCart();
  
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error || !data) {
        setNotFound(true);
      } else {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  // Track viewed products for logged-in users
  useEffect(() => {
    if (id) {
      addViewedProduct(id);
    }
  }, [id, addViewedProduct]);

  // Get colors from product variations
  const availableColors: CustomColor[] = product?.variations?.colors || [];
  const isHairExtension = product?.category === 'Hair Extensions';
  const canAddToCart = isHairExtension && availableColors.length > 0 ? selectedColor !== '' : true;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">
          Product Not Found
        </h1>
        <p className="text-muted-foreground mb-6">
          The product you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  const wholesaleThreshold = product.wholesale_min_qty || 6;
  const isWholesale = quantity >= wholesaleThreshold;
  const currentPrice = isWholesale && product.wholesale_price ? product.wholesale_price : product.retail_price;
  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Please select a color');
      return;
    }

    addItem({
      id: `${product.id}-${selectedColor}`,
      name: product.name,
      price: product.retail_price,
      wholesalePrice: product.wholesale_price || 0,
      quantity,
      color: selectedColor,
      image: product.image_url || '/placeholder.svg',
      category: product.category,
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  // Get selected color data
  const selectedColorData = selectedColor ? availableColors.find(c => c.name === selectedColor) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted/30 gradient-border mx-auto max-w-md lg:max-w-none w-full">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-4">
            <span className="text-sm text-primary font-medium uppercase tracking-wider">
              {product.subcategory || product.category}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {product.name}
          </h1>

          <p className="text-muted-foreground mb-6 font-body leading-relaxed text-sm md:text-base">
            {product.description || 'No description available.'}
          </p>

          {/* Price */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-foreground">
                Ksh {currentPrice.toLocaleString()}
              </span>
              {isWholesale && product.wholesale_price && (
                <span className="text-lg text-muted-foreground line-through">
                  Ksh {product.retail_price.toLocaleString()}
                </span>
              )}
            </div>
            
            {isWholesale && product.wholesale_price && (
              <div className="flex items-center gap-2 text-accent text-sm">
                <Check className="w-4 h-4" />
                Wholesale price applied!
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Retail:</span> Ksh {product.retail_price.toLocaleString()}
              </p>
              {product.wholesale_price && (
                <p className="text-sm text-muted-foreground">
                  <span className="text-accent font-medium">Wholesale:</span> Ksh {product.wholesale_price.toLocaleString()}
                  <span className="text-xs ml-1">({wholesaleThreshold}+ items)</span>
                </p>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {/* Color Selector - Large swatches for hair extensions */}
            {availableColors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Color {isHairExtension && <span className="text-destructive">*</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {availableColors.map((color) => {
                    const isSelected = selectedColor === color.name;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                          isSelected 
                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {color.hex2 ? (
                          <svg width={48} height={48}>
                            <defs>
                              <linearGradient id={`detail-grad-${color.name}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color.hex} />
                                <stop offset="45%" stopColor={color.hex} />
                                <stop offset="55%" stopColor={color.hex2} />
                                <stop offset="100%" stopColor={color.hex2} />
                              </linearGradient>
                            </defs>
                            <circle cx={24} cy={24} r={22} fill={`url(#detail-grad-${color.name})`} stroke="hsl(var(--border))" strokeWidth="1" />
                          </svg>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full border border-border"
                            style={{ backgroundColor: color.hex }}
                          />
                        )}
                        <span className="text-xs font-medium text-foreground max-w-[60px] truncate">{color.name}</span>
                      </button>
                    );
                  })}
                </div>
                {isHairExtension && !selectedColor && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please select a color
                  </p>
                )}
                {selectedColorData && (
                  <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {selectedColorData.hex2 ? (
                      <svg width={36} height={36}>
                        <defs>
                          <linearGradient id="selected-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={selectedColorData.hex} />
                            <stop offset="45%" stopColor={selectedColorData.hex} />
                            <stop offset="55%" stopColor={selectedColorData.hex2} />
                            <stop offset="100%" stopColor={selectedColorData.hex2} />
                          </linearGradient>
                        </defs>
                        <circle cx={18} cy={18} r={16} fill="url(#selected-grad)" stroke="hsl(var(--border))" strokeWidth="1" />
                      </svg>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full border border-border"
                        style={{ backgroundColor: selectedColorData.hex }}
                      />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      Selected: {selectedColorData.name}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-semibold text-foreground">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                {product.wholesale_price && quantity < wholesaleThreshold && (
                  <span className="text-sm text-muted-foreground ml-4">
                    Add {wholesaleThreshold - quantity} more for wholesale price
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-4 border-t border-border mb-6">
            <span className="text-lg font-medium text-foreground">Total:</span>
            <span className="text-2xl font-bold gradient-text">
              Ksh {totalPrice.toLocaleString()}
            </span>
          </div>

          {/* Add to Cart */}
          <Button
            size="xl"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg py-6"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {canAddToCart ? 'Add to Cart' : 'Select Color Above'}
          </Button>
          
          {isHairExtension && availableColors.length > 0 && !canAddToCart && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please select a color to add to cart
            </p>
          )}
        </div>
      </div>

      <ProductReviews productId={id || ''} />
    </div>
  );
};

export default ProductDetail;
