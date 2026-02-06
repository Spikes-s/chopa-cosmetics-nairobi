import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products, isHairExtension } from '@/data/products';
import { findColor } from '@/data/hairColors';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { ShoppingCart, Minus, Plus, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, addViewedProduct } = useCart();
  
  const [dbProduct, setDbProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check local data first
  const localProduct = products.find((p) => p.id === id);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(localProduct?.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setDbProduct(data);
      }
      setLoading(false);
    };

    // If not found in local products, try DB
    if (!localProduct) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [id, localProduct]);

  // Track viewed products for logged-in users
  useEffect(() => {
    if (id) {
      addViewedProduct(id);
    }
  }, [id, addViewedProduct]);

  // Use either local or DB product
  const product = localProduct || (dbProduct ? {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: dbProduct.retail_price,
    wholesalePrice: dbProduct.wholesale_price || 0,
    category: dbProduct.category,
    subcategory: dbProduct.subcategory || '',
    image: dbProduct.image_url || '/placeholder.svg',
    colors: [],
    sizes: [],
    inStock: dbProduct.in_stock ?? true,
  } : null);

  // Determine if product is a hair extension (braid)
  const isExtension = product ? isHairExtension(product) : false;
  
  // Get available colors for the product
  const availableColors = localProduct?.colors || [];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">
          Product Not Found
        </h1>
        <Button onClick={() => navigate('/products')}>
          Back to Products
        </Button>
      </div>
    );
  }

  const wholesaleThreshold = dbProduct?.wholesale_min_qty || (isExtension ? 10 : 6);
  const isWholesale = quantity >= wholesaleThreshold;
  
  const currentPrice = isWholesale ? product.wholesalePrice : product.price;
  const totalPrice = currentPrice * quantity;

  // Validation for hair extensions - must select color
  const canAddToCart = isExtension ? selectedColor !== '' : true;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Please select a color');
      return;
    }

    addItem({
      id: `${product.id}-${selectedSize}-${selectedColor}`,
      name: product.name,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      quantity,
      size: selectedSize,
      color: selectedColor,
      image: product.image,
      category: product.category,
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  // Get color hex for preview
  const selectedColorData = selectedColor ? findColor(selectedColor) : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image - Large and Centered on Mobile */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted/30 gradient-border mx-auto max-w-md lg:max-w-none w-full">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Info */}
        <div className="flex flex-col">
          <div className="mb-4">
            <span className="text-sm text-primary font-medium uppercase tracking-wider">
              {product.subcategory}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
            {product.name}
          </h1>

          {/* Short Description */}
          <p className="text-muted-foreground mb-6 font-body leading-relaxed text-sm md:text-base">
            {product.description}
          </p>

          {/* Price */}
          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-foreground">
                Ksh {currentPrice.toLocaleString()}
              </span>
              {isWholesale && (
                <span className="text-lg text-muted-foreground line-through">
                  Ksh {product.price.toLocaleString()}
                </span>
              )}
            </div>
            
            {isWholesale && (
              <div className="flex items-center gap-2 text-accent text-sm">
                <Check className="w-4 h-4" />
                Wholesale price applied!
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Retail:</span> Ksh {product.price.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="text-accent font-medium">Wholesale:</span> Ksh {product.wholesalePrice.toLocaleString()}
                <span className="text-xs ml-1">
                  ({wholesaleThreshold}+ items)
                </span>
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4 mb-6">
            {/* Size Selector - for non-extensions */}
            {!isExtension && localProduct?.sizes && localProduct.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Size
                </label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {localProduct.sizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color Selector - Required for hair extensions */}
            {availableColors.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Color {isExtension && <span className="text-destructive">*</span>}
                </label>
                <Select 
                  value={selectedColor} 
                  onValueChange={setSelectedColor}
                >
                  <SelectTrigger className={`w-full ${isExtension && !selectedColor && 'border-destructive/50'}`}>
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableColors.map((color) => {
                      const colorData = findColor(color);
                      return (
                        <SelectItem key={color} value={color}>
                          <div className="flex items-center gap-2">
                            {colorData && (
                              <div 
                                className="w-4 h-4 rounded-full border border-border"
                                style={{ backgroundColor: colorData.hex }}
                              />
                            )}
                            {color}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {isExtension && !selectedColor && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please select a color
                  </p>
                )}
                {selectedColorData && (
                  <div className="mt-2 flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: selectedColorData.hex }}
                    />
                    <span className="text-sm text-muted-foreground">
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
                
                {quantity < wholesaleThreshold && (
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

          {/* Add to Cart - Hot Pink Button */}
          <Button
            size="xl"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg py-6"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {canAddToCart ? 'Add to Cart' : 'Select Color Above'}
          </Button>
          
          {isExtension && !canAddToCart && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please select a color to add to cart
            </p>
          )}
        </div>
      </div>

      {/* Customer Reviews Section */}
      <ProductReviews productId={id || ''} />
    </div>
  );
};

export default ProductDetail;
