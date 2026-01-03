import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { categories } from '@/data/products';

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
  variations: any;
  in_stock: boolean | null;
}

const ProductsManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    retail_price: '',
    wholesale_price: '',
    wholesale_min_qty: '6',
    image_url: '',
    in_stock: true,
  });

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
    fetchProducts();
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
      image_url: '',
      in_stock: true,
    });
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      subcategory: product.subcategory || '',
      retail_price: product.retail_price.toString(),
      wholesale_price: product.wholesale_price?.toString() || '',
      wholesale_min_qty: product.wholesale_min_qty?.toString() || '6',
      image_url: product.image_url || '',
      in_stock: product.in_stock ?? true,
    });
    setIsDialogOpen(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      subcategory: formData.subcategory || null,
      retail_price: parseFloat(formData.retail_price),
      wholesale_price: formData.wholesale_price ? parseFloat(formData.wholesale_price) : null,
      wholesale_min_qty: parseInt(formData.wholesale_min_qty) || 6,
      image_url: formData.image_url || null,
      in_stock: formData.in_stock,
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
                    onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: '' })}
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

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="in_stock"
                  checked={formData.in_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                />
                <Label htmlFor="in_stock">In Stock</Label>
              </div>

              <Button type="submit" className="w-full">
                {editingProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category} • {product.subcategory}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-sm">Retail: Ksh {product.retail_price}</span>
                      {product.wholesale_price && (
                        <span className="text-sm text-accent">Wholesale: Ksh {product.wholesale_price}</span>
                      )}
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
    </div>
  );
};

export default ProductsManager;
