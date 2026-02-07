import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Upload, X, Image } from 'lucide-react';
import { useRef } from 'react';

interface BrandSubcategory {
  id: string;
  category_id: string;
  parent_subcategory: string;
  brand_name: string;
  brand_slug: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
}

interface BrandSubcategoriesManagerProps {
  categoryId: string;
  parentSubcategory: string;
}

const BrandSubcategoriesManager = ({ categoryId, parentSubcategory }: BrandSubcategoriesManagerProps) => {
  const [brands, setBrands] = useState<BrandSubcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandSubcategory | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    brand_name: '',
    image_url: '',
  });

  const fetchBrands = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('brand_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('parent_subcategory', parentSubcategory)
      .order('display_order', { ascending: true });

    if (error) {
      toast({ title: 'Error loading brands', variant: 'destructive' });
    } else {
      setBrands(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (categoryId && parentSubcategory) {
      fetchBrands();

      const channel = supabase
        .channel('brand-subcategories-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'brand_subcategories'
        }, () => fetchBrands())
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [categoryId, parentSubcategory]);

  const resetForm = () => {
    setFormData({ brand_name: '', image_url: '' });
    setEditingBrand(null);
  };

  const handleEdit = (brand: BrandSubcategory) => {
    setEditingBrand(brand);
    setFormData({
      brand_name: brand.brand_name,
      image_url: brand.image_url || '',
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `brands/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.brand_name.trim()) {
      toast({ title: 'Brand name is required', variant: 'destructive' });
      return;
    }

    const brandData = {
      category_id: categoryId,
      parent_subcategory: parentSubcategory,
      brand_name: formData.brand_name.trim(),
      brand_slug: generateSlug(formData.brand_name),
      image_url: formData.image_url || null,
    };

    if (editingBrand) {
      const { error } = await supabase
        .from('brand_subcategories')
        .update(brandData)
        .eq('id', editingBrand.id);

      if (error) {
        toast({ title: 'Failed to update brand', variant: 'destructive' });
      } else {
        toast({ title: 'Brand updated successfully' });
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const maxOrder = Math.max(...brands.map(b => b.display_order), 0);
      const { error } = await supabase
        .from('brand_subcategories')
        .insert([{ ...brandData, display_order: maxOrder + 1 }]);

      if (error) {
        toast({ title: 'Failed to create brand', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Brand created successfully' });
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('brand_subcategories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to delete brand', variant: 'destructive' });
    } else {
      toast({ title: 'Brand deleted' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Brands in {parentSubcategory}</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="w-4 h-4" /> Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder="e.g., Chanel"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Brand Image</Label>
                {formData.image_url ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                    <img src={formData.image_url} alt="Brand preview" className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload</p>
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
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingBrand ? 'Update' : 'Create'} Brand</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {brands.length === 0 ? (
        <p className="text-muted-foreground text-sm">No brands yet. Add your first brand!</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {brands.map((brand) => (
            <Card key={brand.id} className="group relative overflow-hidden">
              <CardContent className="p-3">
                <div className="aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                  {brand.image_url ? (
                    <img src={brand.image_url} alt={brand.brand_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="font-medium text-sm text-center truncate">{brand.brand_name}</p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => handleEdit(brand)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDelete(brand.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrandSubcategoriesManager;
