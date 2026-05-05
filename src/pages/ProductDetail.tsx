import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { ShoppingCart, Minus, Plus, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import ProductReviews from '@/components/ProductReviews';
import ProductGallery from '@/components/ProductGallery';
import SmartRecommendations from '@/components/SmartRecommendations';
import ProductVariantSelector from '@/components/ProductVariantSelector';

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
  image?: string;
}

interface VariantGroup {
  type: string;
  label: string;
  options: { name: string; image?: string; price?: number }[];
}

interface NamedImage {
  name: string;
  url: string;
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
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase
        .from('public_products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !data) { setNotFound(true); } else { setProduct(data); }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (id) addViewedProduct(id);
  }, [id, addViewedProduct]);

  const availableColors: CustomColor[] = product?.variations?.colors || [];
  const variantGroups: VariantGroup[] = product?.variations?.variant_groups || [];
  const namedImages: NamedImage[] = product?.variations?.named_images || [];
  const isHairExtension = product?.category === 'Hair Extensions';
  const hasColors = availableColors.length > 0;
  const hasVariants = variantGroups.length > 0;

  // Determine if add-to-cart is allowed
  const canAddToCart = useMemo(() => {
    if (isHairExtension && hasColors && !selectedColor) return false;
    // For non-hair products with variants, require at least one selection if variants exist
    return true;
  }, [isHairExtension, hasColors, selectedColor]);

  // Find the best matching image based on selected options
  // Priority: 1. Color, 2. Weight, 3. Size, 4. Quantity
  const resolvedImage = useMemo(() => {
    const priorities = ['color', 'colour', 'weight', 'capacity', 'size', 'quantity', 'flavour', 'scent', 'name'];
    
    // Check color-specific image first
    if (selectedColor) {
      const colorData = availableColors.find(c => c.name === selectedColor);
      if (colorData?.image) return colorData.image;
      // Check named images for color match
      const namedMatch = namedImages.find(ni => ni.name.toLowerCase() === selectedColor.toLowerCase());
      if (namedMatch) return namedMatch.url;
    }

    // Check variant selections in priority order
    for (const type of priorities) {
      const value = selectedVariants[type];
      if (!value) continue;
      const namedMatch = namedImages.find(ni => ni.name.toLowerCase() === value.toLowerCase());
      if (namedMatch) return namedMatch.url;
    }

    return null;
  }, [selectedColor, selectedVariants, availableColors, namedImages]);

  // Resolve variant-specific price (first match wins by priority)
  const variantPrice = useMemo(() => {
    const priorities = ['weight', 'capacity', 'size', 'quantity'];
    for (const type of priorities) {
      const value = selectedVariants[type];
      if (!value) continue;
      const group = variantGroups.find(g => g.type === type);
      const option = group?.options.find(o => o.name === value);
      if (option?.price && option.price > 0) return option.price;
    }
    return null;
  }, [selectedVariants, variantGroups]);

  const handleVariantChange = (type: string, value: string) => {
    setSelectedVariants(prev => ({ ...prev, [type]: value }));
  };

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
        <h1 className="text-2xl font-display font-bold text-foreground mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-6">The product you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/products')}>Back to Products</Button>
      </div>
    );
  }

  const wholesaleThreshold = product.wholesale_min_qty || 6;
  const isWholesale = quantity >= wholesaleThreshold;
  const baseRetailPrice = variantPrice ?? product.retail_price;
  const currentPrice = isWholesale && product.wholesale_price ? product.wholesale_price : baseRetailPrice;
  const totalPrice = currentPrice * quantity;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Please select a color');
      return;
    }

    const variantLabel = Object.entries(selectedVariants)
      .filter(([_, v]) => v)
      .map(([_, v]) => v)
      .join('-');
    const cartId = [product.id, selectedColor, variantLabel].filter(Boolean).join('-');

    addItem({
      id: cartId,
      name: product.name,
      price: baseRetailPrice,
      wholesalePrice: product.wholesale_price || 0,
      quantity,
      color: selectedColor,
      image: resolvedImage || product.image_url || '/placeholder.svg',
      category: product.category,
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  // Build gallery images - resolved variant image takes priority
  const galleryMainImage = resolvedImage || product.image_url || '/placeholder.svg';
  const galleryAdditional = resolvedImage
    ? [product.image_url, ...(product.additional_images || [])].filter(Boolean) as string[]
    : product.additional_images || undefined;

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Image Gallery */}
        <div className="mx-auto max-w-md lg:max-w-none w-full">
          <ProductGallery
            mainImage={galleryMainImage}
            additionalImages={galleryAdditional}
            productName={product.name}
            productDescription={product.description || undefined}
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
                <Check className="w-4 h-4" /> Wholesale price applied!
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Retail:</span> Ksh {baseRetailPrice.toLocaleString()}
                {variantPrice && <span className="text-xs ml-1 text-primary">(variant price)</span>}
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
            {/* Color Selector */}
            {hasColors && (
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
                {selectedColor && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedColor}</span>
                  </div>
                )}
              </div>
            )}

            {/* Other Variant Selectors (Weight, Capacity, Size, Quantity) */}
            {hasVariants && (
              <ProductVariantSelector
                variantGroups={variantGroups}
                namedImages={namedImages}
                selectedVariants={selectedVariants}
                onVariantChange={handleVariantChange}
              />
            )}

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-semibold text-foreground">{quantity}</span>
                <Button variant="outline" size="icon" onClick={() => setQuantity(quantity + 1)}>
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
            <span className="text-2xl font-bold gradient-text">Ksh {totalPrice.toLocaleString()}</span>
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
          
          {isHairExtension && hasColors && !canAddToCart && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please select a color to add to cart
            </p>
          )}
        </div>
      </div>

      <ProductReviews productId={id || ''} />

      <SmartRecommendations 
        currentProductId={id || ''} 
        category={product.category}
        subcategory={product.subcategory}
      />
    </div>
  );
};

export default ProductDetail;
