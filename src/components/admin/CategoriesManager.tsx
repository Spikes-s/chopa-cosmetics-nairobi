import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, X, FolderTree, GripVertical } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  subcategories: string[];
  display_order: number;
  is_active: boolean;
}

const CategoriesManager = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newSubcategory, setNewSubcategory] = useState('');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image_url: '',
    subcategories: [] as string[],
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } else {
      setCategories(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();

    // Real-time subscription
    const channel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => fetchCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      image_url: '',
      subcategories: [],
    });
    setEditingCategory(null);
    setNewSubcategory('');
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      image_url: category.image_url || '',
      subcategories: category.subcategories || [],
    });
    setIsDialogOpen(true);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const addSubcategory = () => {
    const trimmed = newSubcategory.trim();
    if (!trimmed) return;
    if (formData.subcategories.includes(trimmed)) {
      toast({ title: 'Subcategory already exists', variant: 'destructive' });
      return;
    }
    setFormData({
      ...formData,
      subcategories: [...formData.subcategories, trimmed],
    });
    setNewSubcategory('');
  };

  const removeSubcategory = (sub: string) => {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.filter(s => s !== sub),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Category name is required', variant: 'destructive' });
      return;
    }

    const categoryData = {
      name: formData.name.trim(),
      slug: formData.slug || generateSlug(formData.name),
      image_url: formData.image_url || null,
      subcategories: formData.subcategories,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update category',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Category updated successfully' });
        setIsDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    } else {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
      const { error } = await supabase
        .from('categories')
        .insert([{ ...categoryData, display_order: maxOrder + 1 }]);

      if (error) {
        toast({
          title: 'Error',
          description: error.message.includes('duplicate') 
            ? 'Category with this name already exists' 
            : 'Failed to create category',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Category created successfully' });
        setIsDialogOpen(false);
        resetForm();
        fetchCategories();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Category deleted' });
      fetchCategories();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Categories</h2>
          <p className="text-muted-foreground">Manage product categories and subcategories</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  })}
                  placeholder="e.g., Hair Extensions"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., hair-extensions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (optional)</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Subcategories</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.subcategories.map(sub => (
                    <Badge key={sub} variant="secondary" className="flex items-center gap-1">
                      {sub}
                      <button type="button" onClick={() => removeSubcategory(sub)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newSubcategory}
                    onChange={(e) => setNewSubcategory(e.target.value)}
                    placeholder="Add subcategory..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                  />
                  <Button type="button" variant="outline" onClick={addSubcategory}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? 'Update' : 'Create'} Category
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="glass-card">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FolderTree className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {category.subcategories.slice(0, 4).map(sub => (
                      <Badge key={sub} variant="outline" className="text-xs">
                        {sub}
                      </Badge>
                    ))}
                    {category.subcategories.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{category.subcategories.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{category.name}" and all its subcategories.
                        Products in this category will remain but become uncategorized.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(category.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CategoriesManager;
