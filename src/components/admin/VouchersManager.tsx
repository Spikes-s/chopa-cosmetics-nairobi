import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Receipt, Plus, Package, History } from 'lucide-react';

interface Voucher {
  id: string;
  voucher_name: string;
  source_name: string;
  product_id: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number | null;
}

const VouchersManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voucherSources, setVoucherSources] = useState<string[]>(['Main Supplier', 'Wholesale Partner']);
  const [newSource, setNewSource] = useState('');
  
  const [formData, setFormData] = useState({
    voucher_name: '',
    source_name: '',
    product_id: '',
    quantity: '1',
    notes: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch vouchers
    const { data: vouchersData } = await supabase
      .from('vouchers')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Fetch products
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .order('name');

    setVouchers(vouchersData || []);
    setProducts(productsData || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('vouchers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddSource = () => {
    if (newSource.trim() && !voucherSources.includes(newSource.trim())) {
      setVoucherSources([...voucherSources, newSource.trim()]);
      setNewSource('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.voucher_name || !formData.source_name || !formData.product_id) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const quantity = parseInt(formData.quantity) || 1;

      // Create voucher record
      const { error: voucherError } = await supabase.from('vouchers').insert([{
        voucher_name: formData.voucher_name,
        source_name: formData.source_name,
        product_id: formData.product_id,
        quantity,
        notes: formData.notes || null,
        received_by: user?.id,
      }]);

      if (voucherError) throw voucherError;

      // Update product stock
      const product = products.find(p => p.id === formData.product_id);
      if (product) {
        const newStock = (product.stock_quantity || 0) + quantity;
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: newStock,
            in_stock: true
          })
          .eq('id', formData.product_id);

        if (stockError) throw stockError;
      }

      toast({
        title: 'Voucher Received',
        description: `Added ${quantity} units to inventory`,
      });

      setFormData({
        voucher_name: '',
        source_name: '',
        product_id: '',
        quantity: '1',
        notes: '',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process voucher',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return 'Unknown Product';
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receive Voucher */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Receive Voucher
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="voucher_name">Voucher Name/ID</Label>
              <Input
                id="voucher_name"
                placeholder="e.g., INV-2024-001"
                value={formData.voucher_name}
                onChange={(e) => setFormData({ ...formData, voucher_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Source (From)</Label>
              <Select
                value={formData.source_name}
                onValueChange={(value) => setFormData({ ...formData, source_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {voucherSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add new source..."
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddSource}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => setFormData({ ...formData, product_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Stock: {product.stock_quantity || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <Package className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Processing...' : 'Receive & Update Inventory'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Voucher History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Voucher History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : vouchers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No vouchers received yet
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {vouchers.map((voucher) => (
                  <div key={voucher.id} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {voucher.voucher_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          From: {voucher.source_name}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-accent">
                        +{voucher.quantity}
                      </span>
                    </div>
                    <p className="text-sm text-primary">
                      {getProductName(voucher.product_id)}
                    </p>
                    {voucher.notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {voucher.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {format(new Date(voucher.created_at), 'PPp')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default VouchersManager;
