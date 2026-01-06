import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { products, braidColors, extraLongColors } from '@/data/products';
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

// Braid length options with price adjustments
const braidLengths = [
  { value: 'short', label: 'Short', priceMultiplier: 1 },
  { value: 'long', label: 'Long', priceMultiplier: 1.3 },
  { value: 'extra-long', label: 'Extra Long', priceMultiplier: 1.6 },
];

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  
  const product = products.find((p) => p.id === id);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || '');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedLength, setSelectedLength] = useState('');

  // Determine if product is a braid
  const isBraid = product?.category.toLowerCase() === 'braids';
  
  // Get available colors based on length for braids
  const availableColors = useMemo(() => {
    if (!isBraid) return product?.colors || [];
    if (selectedLength === 'extra-long') return extraLongColors;
    return braidColors;
  }, [isBraid, selectedLength, product?.colors]);

  // Reset color when length changes (for braids)
  const handleLengthChange = (length: string) => {
    setSelectedLength(length);
    setSelectedColor(''); // Reset color selection
  };

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

  const wholesaleThreshold = isBraid ? 10 : 6;
  const isWholesale = quantity >= wholesaleThreshold;
  
  // Calculate price based on length for braids
  const lengthMultiplier = isBraid && selectedLength 
    ? braidLengths.find(l => l.value === selectedLength)?.priceMultiplier || 1 
    : 1;
  
  const basePrice = product.price * lengthMultiplier;
  const baseWholesalePrice = product.wholesalePrice * lengthMultiplier;
  const currentPrice = isWholesale ? baseWholesalePrice : basePrice;
  const totalPrice = currentPrice * quantity;

  // Validation for braids - must select length and color
  const canAddToCart = isBraid 
    ? selectedLength !== '' && selectedColor !== ''
    : true;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      toast.error('Please select all required options');
      return;
    }
    const productName = isBraid && selectedLength
      ? `${product.name} - ${braidLengths.find(l => l.value === selectedLength)?.label}`
      : product.name;

    addItem({
      id: `${product.id}-${selectedLength}-${selectedSize}-${selectedColor}`,
      name: productName,
      price: Math.round(basePrice),
      wholesalePrice: Math.round(baseWholesalePrice),
      quantity,
      size: selectedSize,
      color: selectedColor,
      image: product.image,
      category: product.category,
    });
    
    toast.success(`${productName} added to cart!`);
  };

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
        {/* Product Image */}
        <div className="aspect-square rounded-2xl overflow-hidden bg-muted/30 gradient-border">
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

          <p className="text-muted-foreground mb-6 font-body leading-relaxed">
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
            {/* Braid Length Selector - Required for braids */}
            {isBraid && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Length <span className="text-destructive">*</span>
                </label>
                <Select value={selectedLength} onValueChange={handleLengthChange}>
                  <SelectTrigger className={`w-full ${!selectedLength && 'border-destructive/50'}`}>
                    <SelectValue placeholder="Select length (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {braidLengths.map((length) => (
                      <SelectItem key={length.value} value={length.value}>
                        {length.label} {length.priceMultiplier > 1 && `(+${Math.round((length.priceMultiplier - 1) * 100)}%)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedLength && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please select a length
                  </p>
                )}
              </div>
            )}

            {/* Size Selector - for non-braids */}
            {!isBraid && product.sizes && product.sizes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Size
                </label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.sizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Color Selector - Required for braids, optional for others */}
            {(isBraid || (product.colors && product.colors.length > 0)) && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Color {isBraid && <span className="text-destructive">*</span>}
                </label>
                <Select 
                  value={selectedColor} 
                  onValueChange={setSelectedColor}
                  disabled={isBraid && !selectedLength}
                >
                  <SelectTrigger className={`w-full ${isBraid && !selectedColor && selectedLength && 'border-destructive/50'}`}>
                    <SelectValue placeholder={isBraid && !selectedLength ? "Select length first" : "Select color"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {availableColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isBraid && selectedLength && !selectedColor && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Please select a color
                  </p>
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

          {/* Add to Cart */}
          <Button
            variant="gradient"
            size="xl"
            className="w-full"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {canAddToCart ? 'Add to Cart' : 'Select Options Above'}
          </Button>
          
          {isBraid && !canAddToCart && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Please select both length and color to add to cart
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
