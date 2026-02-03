import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, MapPin, Pencil, Trash2, Star, Navigation, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  is_main: boolean;
  is_active: boolean;
  service_radius_km: number | null;
  display_order: number;
}

const BranchesManager = () => {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    contact_phone: '',
    contact_email: '',
    is_main: false,
    is_active: true,
    service_radius_km: '',
  });

  useEffect(() => {
    fetchBranches();
    
    const channel = supabase
      .channel('branches-admin')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'branches'
      }, () => {
        fetchBranches();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('is_main', { ascending: false })
      .order('display_order');
    
    if (error) {
      toast({ title: 'Error fetching branches', description: error.message, variant: 'destructive' });
    } else {
      setBranches(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      contact_phone: '',
      contact_email: '',
      is_main: false,
      is_active: true,
      service_radius_km: '',
    });
    setEditingBranch(null);
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address || '',
      latitude: branch.latitude?.toString() || '',
      longitude: branch.longitude?.toString() || '',
      contact_phone: branch.contact_phone || '',
      contact_email: branch.contact_email || '',
      is_main: branch.is_main,
      is_active: branch.is_active,
      service_radius_km: branch.service_radius_km?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Branch name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    const branchData = {
      name: formData.name.trim(),
      address: formData.address.trim() || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      contact_phone: formData.contact_phone.trim() || null,
      contact_email: formData.contact_email.trim() || null,
      is_main: formData.is_main,
      is_active: formData.is_active,
      service_radius_km: formData.service_radius_km ? parseFloat(formData.service_radius_km) : null,
    };

    try {
      // If setting as main, unset other main branches first
      if (branchData.is_main) {
        await supabase
          .from('branches')
          .update({ is_main: false })
          .neq('id', editingBranch?.id || '');
      }

      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', editingBranch.id);

        if (error) throw error;
        toast({ title: 'Branch updated successfully' });
      } else {
        const { error } = await supabase
          .from('branches')
          .insert(branchData);

        if (error) throw error;
        toast({ title: 'Branch added successfully' });
      }

      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error saving branch', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!branchToDelete) return;

    // Prevent deleting the last branch
    if (branches.length <= 1) {
      toast({ title: 'Cannot delete', description: 'At least one branch must exist', variant: 'destructive' });
      setDeleteDialogOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchToDelete.id);

      if (error) throw error;
      toast({ title: 'Branch deleted successfully' });
    } catch (error: any) {
      toast({ title: 'Error deleting branch', description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  const handlePasteGoogleMapsLink = () => {
    navigator.clipboard.readText().then(text => {
      // Try to extract coordinates from Google Maps link
      const patterns = [
        /@(-?\d+\.\d+),(-?\d+\.\d+)/, // Standard maps link
        /place\/.*@(-?\d+\.\d+),(-?\d+\.\d+)/, // Place link
        /q=(-?\d+\.\d+),(-?\d+\.\d+)/, // Query parameter
        /ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll parameter
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          setFormData(prev => ({
            ...prev,
            latitude: match[1],
            longitude: match[2]
          }));
          toast({ title: 'Coordinates extracted from link' });
          return;
        }
      }

      toast({ title: 'Could not extract coordinates', description: 'Please enter them manually', variant: 'destructive' });
    }).catch(() => {
      toast({ title: 'Clipboard access denied', variant: 'destructive' });
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-foreground">Branch Locations</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Branch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Branch"
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Coordinates</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={handlePasteGoogleMapsLink}>
                    Paste from Maps Link
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                      placeholder="Latitude"
                    />
                  </div>
                  <div>
                    <Input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                      placeholder="Longitude"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                  placeholder="e.g., 0712345678"
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="e.g., branch@chopacosmetics.co.ke"
                />
              </div>

              <div>
                <Label htmlFor="service_radius">Service Radius (km)</Label>
                <Input
                  id="service_radius"
                  type="number"
                  step="0.1"
                  value={formData.service_radius_km}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_radius_km: e.target.value }))}
                  placeholder="e.g., 10"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_main">Set as Main Branch</Label>
                <Switch
                  id="is_main"
                  checked={formData.is_main}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_main: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_active">Active (visible to customers)</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <Button onClick={handleSubmit} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingBranch ? 'Update Branch' : 'Add Branch'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} variant="glass" className={!branch.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-primary" />
                {branch.name}
                {branch.is_main && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {branch.address && (
                <p className="text-sm text-muted-foreground">{branch.address}</p>
              )}
              
              {(branch.latitude && branch.longitude) && (
                <p className="text-xs text-muted-foreground font-mono">
                  {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}
                </p>
              )}

              {branch.service_radius_km && (
                <p className="text-xs text-accent">
                  Service radius: {branch.service_radius_km} km
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(branch)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                {branch.latitude && branch.longitude && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://www.google.com/maps?q=${branch.latitude},${branch.longitude}`, '_blank')}
                  >
                    <Navigation className="w-3 h-3 mr-1" />
                    View
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setBranchToDelete(branch);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Branch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{branchToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BranchesManager;
