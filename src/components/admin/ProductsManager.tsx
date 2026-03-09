import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Upload, Image, X, AlertTriangle, Calendar, Palette } from 'lucide-react';
import { format, parseISO, differenceInDays, addMonths, isBefore } from 'date-fns';
import ColorPickerDialog from './ColorPickerDialog';
import VariantManager, { VariantGroup } from './VariantManager';
import NamedImageUploader, { NamedImage } from './NamedImageUploader';

interface CustomColor {
  name: string;
  hex: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  image_url: string | null;
  additional_images: string[] | null;
  barcode: string | null;
  variations: any;
  in_stock: boolean | null;
  stock_quantity: number | null;
  expiry_date: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: string[];
}

const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const LOW_STOCK_THRESHOLD = 5;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    retail_price: '',
    wholesale_price: '',
    wholesale_min_qty: '6',
    cost_price: '',
    image_url: '',
    additional_images: [] as string[],
    barcode: '',
    in_stock: true,
    stock_quantity: '0',
    expiry_date: '',
    colors: [] as CustomColor[],
    sale_price: '',
    sale_ends_at: '',
    sale_label: '',
    variant_groups: [] as VariantGroup[],
    named_images: [] as NamedImage[],
  });

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, subcategories')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (data) {
      setCategories(data);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

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

  useEffect(() => {
    fetchCategories();
    fetchProducts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('products-manager')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      retail_price: '',
      wholesale_price: '',
      wholesale_min_qty: '6',
      cost_price: '',
      image_url: '',
      additional_images: [],
      barcode: '',
      in_stock: true,
      stock_quantity: '0',
      expiry_date: '',
      colors: [],
      sale_price: '',
      sale_ends_at: '',
      sale_label: '',
      variant_groups: [],
      named_images: [],
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const variations = product.variations as any;
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      subcategory: product.subcategory || '',
      retail_price: product.retail_price.toString(),
      wholesale_price: product.wholesale_price?.toString() || '',
      wholesale_min_qty: product.wholesale_min_qty?.toString() || '6',
      cost_price: '',
      image_url: product.image_url || '',
      additional_images: product.additional_images || [],
      barcode: product.barcode || '',
      in_stock: product.in_stock ?? true,
      stock_quantity: product.stock_quantity?.toString() || '0',
      expiry_date: product.expiry_date || '',
      colors: variations?.colors || [],
      sale_price: (product as any).sale_price?.toString() || '',
      sale_ends_at: (product as any).sale_ends_at ? new Date((product as any).sale_ends_at).toISOString().slice(0, 16) : '',
      sale_label: (product as any).sale_label || '',
      variant_groups: variations?.variant_groups || [],
      named_images: variations?.named_images || [],
    });
    setIsDialogOpen(true);
  };

  const getStockStatus = (product: Product) => {
    const qty = product.stock_quantity ?? 0;
    if (qty === 0) return { label: 'Out of Stock', className: 'bg-destructive text-destructive-foreground' };
    if (qty <= LOW_STOCK_THRESHOLD) return { label: 'Low Stock', className: 'bg-orange-500 text-white' };
    return { label: 'In Stock', className: 'bg-green-500 text-white' };
  };

  // Check for low stock products and show alert
  const lowStockProducts = products.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= LOW_STOCK_THRESHOLD);

  // Check for expiring/expired products
  const expiryAlerts = useMemo(() => {
    const today = new Date();
    const twoMonthsFromNow = addMonths(today, 2);
    
    const expiringSoon: Product[] = [];
    const expired: Product[] = [];

    products.forEach(product => {
      if (product.expiry_date) {
        const expiryDate = parseISO(product.expiry_date);
        if (isBefore(expiryDate, today)) {
          expired.push(product);
        } else if (isBefore(expiryDate, twoMonthsFromNow)) {
          expiringSoon.push(product);
        }
      }
    });

    return { expiringSoon, expired };
  }, [products]);

  const getExpiryStatus = (product: Product) => {
    if (!product.expiry_date) return null;
    
    const today = new Date();
    const expiryDate = parseISO(product.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (daysUntilExpiry < 0) {
      return { label: 'Expired', className: 'bg-destructive text-destructive-foreground', days: daysUntilExpiry };
    }
    if (daysUntilExpiry <= 60) {
      return { label: `Expires in ${daysUntilExpiry} days`, className: 'bg-orange-500 text-white', days: daysUntilExpiry };
    }
    return { label: `Expires ${format(expiryDate, 'MMM d, yyyy')}`, className: 'bg-green-500/20 text-green-600', days: daysUntilExpiry };
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      fetchProducts();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, image_url: '' });
  };

  // Handle additional image upload
  const handleAdditionalImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingAdditional(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) continue;
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);
          uploadedUrls.push(publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData({ 
          ...formData, 
          additional_images: [...formData.additional_images, ...uploadedUrls] 
        });
        toast({
          title: 'Success',
          description: `${uploadedUrls.length} image(s) uploaded successfully`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploadingAdditional(false);
      if (additionalFileInputRef.current) {
        additionalFileInputRef.current.value = '';
      }
    }
  };

  const removeAdditionalImage = (index: number) => {
    setFormData({
      ...formData,
      additional_images: formData.additional_images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stockQty = parseInt(formData.stock_quantity) || 0;
    
    // Build variations object - cast to any for JSON compatibility
    const variations: any = {};
    if (formData.colors.length > 0) {
      variations.colors = formData.colors.map(c => ({ name: c.name, hex: c.hex, ...(c as any).hex2 ? { hex2: (c as any).hex2 } : {} }));
    }
    if (formData.variant_groups.length > 0) {
      variations.variant_groups = formData.variant_groups;
    }
    if (formData.named_images.length > 0) {
      variations.named_images = formData.named_images;
    }
    const finalVariations = Object.keys(variations).length > 0 ? variations : null;

    const productData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      subcategory: formData.subcategory || null,
      retail_price: parseFloat(formData.retail_price),
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
      wholesale_min_qty: parseInt(formData.wholesale_min_qty) || 6,
      image_url: formData.image_url || null,
      additional_images: formData.additional_images.length > 0 ? formData.additional_images : [],
      barcode: formData.barcode || null,
      in_stock: stockQty > 0,
      stock_quantity: stockQty,
      expiry_date: formData.expiry_date || null,
      variations: finalVariations,
      sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
      sale_ends_at: formData.sale_ends_at ? new Date(formData.sale_ends_at).toISOString() : null,
      sale_label: formData.sale_label || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update product',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    } else {
      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create product',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Success',
          description: 'Product created successfully',
        });
        setIsDialogOpen(false);
        resetForm();
        fetchProducts();
      }
    }
  };

  // Handle category change - show color picker for Hair Extensions
  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value, subcategory: '' });
    
    // If selecting Hair Extensions and creating new product, show color picker
    if (value === 'Hair Extensions' && !editingProduct) {
      setShowColorPicker(true);
    }
  };

  const handleColorsConfirmed = (colors: CustomColor[]) => {
    setFormData({ ...formData, colors });
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCategory = categories.find(c => c.name === formData.category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subcategory</Label>
                  <Select
                    value={formData.subcategory}
                    onValueChange={(value) => setFormData({ ...formData, subcategory: value })}
                    disabled={!selectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory?.subcategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retail_price">Retail Price (Ksh)</Label>
                  <Input
                    id="retail_price"
                    type="number"
                    step="0.01"
                    value={formData.retail_price}
                    onChange={(e) => setFormData({ ...formData, retail_price: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wholesale_price">Wholesale Price (Ksh)</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wholesale_min_qty">Min Qty for Wholesale</Label>
                <Input
                  id="wholesale_min_qty"
                  type="number"
                  value={formData.wholesale_min_qty}
                  onChange={(e) => setFormData({ ...formData, wholesale_min_qty: e.target.value })}
                />
              </div>

              {/* Image Upload Section */}
              <div className="space-y-2">
                <Label>Product Image</Label>
                
                {formData.image_url ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={formData.image_url} 
                      alt="Product preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="w-full h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                        <p className="text-xs text-muted-foreground">Max 5MB</p>
                      </>
                    )}
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />

                {/* Optional: Manual URL input */}
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-muted-foreground">or</span>
                  <Input
                    type="url"
                    placeholder="Paste image URL"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Additional Images */}
              <div className="space-y-2">
                <Label>Additional Images</Label>
                <div className="flex flex-wrap gap-2">
                  {formData.additional_images.map((url, index) => (
                    <div key={index} className="relative w-16 h-16 rounded overflow-hidden bg-muted">
                      <img src={url} alt={`Additional ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-0 right-0 h-5 w-5"
                        onClick={() => removeAdditionalImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center hover:border-primary/50"
                    onClick={() => additionalFileInputRef.current?.click()}
                    disabled={uploadingAdditional}
                  >
                    {uploadingAdditional ? (
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <Plus className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <input
                  ref={additionalFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAdditionalImageUpload}
                  disabled={uploadingAdditional}
                />
              </div>

              {/* Barcode */}
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode (for POS scanning)</Label>
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter barcode or SKU"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_quantity">Stock Quantity</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Low stock: ≤5 units
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">Expiry Date</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when 2 months away
                  </p>
                </div>
              </div>

              {/* Colors for Hair Extensions */}
              {formData.category === 'Hair Extensions' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-primary" />
                      Available Colors
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowColorPicker(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {formData.colors.length > 0 ? 'Edit Colors' : 'Add Colors'}
                    </Button>
                  </div>
                  {formData.colors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {formData.colors.map((color) => (
                        <Badge key={color.name} variant="secondary" className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color.hex }}
                          />
                          {color.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No colors added. Click "Add Colors" to add available color options.
                    </p>
                  )}
                </div>
              )}

              {/* Variant Groups (Weight, Capacity, Size, Quantity) */}
              <VariantManager
                variantGroups={formData.variant_groups}
                onChange={(groups) => setFormData({ ...formData, variant_groups: groups })}
              />

              {/* Named Images for Variant Linking */}
              <NamedImageUploader
                namedImages={formData.named_images}
                onChange={(images) => setFormData({ ...formData, named_images: images })}
              />

              {/* Flash Sale Section */}
              <div className="space-y-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <Label className="flex items-center gap-2 text-destructive font-semibold">
                  ⚡ Flash Sale (Optional)
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sale_price" className="text-xs">Sale Price (Ksh)</Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      placeholder="e.g. 800"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sale_ends_at" className="text-xs">Sale Ends At</Label>
                    <Input
                      id="sale_ends_at"
                      type="datetime-local"
                      value={formData.sale_ends_at}
                      onChange={(e) => setFormData({ ...formData, sale_ends_at: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="sale_label" className="text-xs">Sale Label</Label>
                  <Input
                    id="sale_label"
                    value={formData.sale_label}
                    onChange={(e) => setFormData({ ...formData, sale_label: e.target.value })}
                    placeholder="e.g. Flash Sale, Weekend Deal"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isUploading}>
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="p-4">
            <p className="font-semibold text-orange-700 dark:text-orange-400">
              ⚠️ Low Stock Alert: {lowStockProducts.length} product(s) need restocking
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
              {lowStockProducts.map(p => p.name).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expired Products Alert */}
      {expiryAlerts.expired.length > 0 && (
        <Card className="border-destructive bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <p className="font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              ⛔ Expired Products: {expiryAlerts.expired.length} product(s) have expired
            </p>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">
              {expiryAlerts.expired.map(p => `${p.name} (expired ${format(parseISO(p.expiry_date!), 'MMM d, yyyy')})`).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expiring Soon Alert */}
      {expiryAlerts.expiringSoon.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <p className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              ⚠️ Expiring Soon: {expiryAlerts.expiringSoon.length} product(s) expire within 2 months
            </p>
            <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-1">
              {expiryAlerts.expiringSoon.map(p => `${p.name} (${format(parseISO(p.expiry_date!), 'MMM d, yyyy')})`).join(', ')}
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No products found. Add your first product!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                    {product.image_url && product.image_url !== '/placeholder.svg' ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{product.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStockStatus(product).className}`}>
                        {getStockStatus(product).label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{product.category} • {product.subcategory}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-sm">Retail: Ksh {product.retail_price}</span>
                      {product.wholesale_price && (
                        <span className="text-sm text-accent">
                          Wholesale: Ksh {product.wholesale_price} (min qty: {product.wholesale_min_qty || 6})
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">Stock: {product.stock_quantity ?? 0}</span>
                      {(() => {
                        const expiryStatus = getExpiryStatus(product);
                        if (expiryStatus) {
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${expiryStatus.className}`}>
                              {expiryStatus.label}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(product)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Color Picker Dialog for Hair Extensions */}
      <ColorPickerDialog
        open={showColorPicker}
        onOpenChange={setShowColorPicker}
        onColorsConfirmed={handleColorsConfirmed}
        existingColors={formData.colors}
      />
    </div>
  );
};

export default ProductsManager;
