import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Power, RefreshCw, Trash2, Shield, CheckCircle, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SiteControlsProps {
  userEmail?: string;
}

type ResetStep = 'closed' | 'select' | 'confirm' | 'processing' | 'complete';

interface ResetOptions {
  logs: boolean;
  accounts: boolean;
  inventory: boolean;
  orders: boolean;
  messages: boolean;
}

const SuperAdminControls = ({ userEmail }: SiteControlsProps) => {
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [siteStatus, setSiteStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset dialog state
  const [resetStep, setResetStep] = useState<ResetStep>('closed');
  const [resetOptions, setResetOptions] = useState<ResetOptions>({
    logs: true,
    accounts: false,
    inventory: false,
    orders: true,
    messages: true,
  });
  const [confirmationText, setConfirmationText] = useState('');
  const [resetProgress, setResetProgress] = useState<string[]>([]);

  // Check if current user has super_admin role from database (no email check - role-based only)
  useEffect(() => {
    const checkSuperAdminRole = async () => {
      setIsCheckingRole(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsSuperAdmin(false);
          setIsCheckingRole(false);
          return;
        }

        // Check for super_admin role in user_roles table
        const { data: roleData, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'super_admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking super admin role:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!roleData);
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdmin(false);
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkSuperAdminRole();
  }, [userEmail]);

  useEffect(() => {
    const fetchSiteStatus = async () => {
      const { data } = await supabase
        .from('site_controls')
        .select('value')
        .eq('key', 'site_status')
        .maybeSingle();
      
      if (data) {
        setSiteStatus(data.value || 'active');
      }
    };

    if (isSuperAdmin) {
      fetchSiteStatus();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('super_admin_site_status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'site_controls',
            filter: 'key=eq.site_status'
          },
          (payload) => {
            const newValue = payload.new?.value;
            setSiteStatus(newValue || 'active');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isSuperAdmin]);

  const updateSiteStatus = async (status: string) => {
    setIsLoading(true);
    try {
      // First try to update existing record
      const { data: existing, error: fetchError } = await supabase
        .from('site_controls')
        .select('id')
        .eq('key', 'site_status')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('site_controls')
          .update({ 
            value: status, 
            updated_at: new Date().toISOString() 
          })
          .eq('key', 'site_status');

        if (error) throw error;
      } else {
        // Insert new record if doesn't exist
        const { error } = await supabase
          .from('site_controls')
          .insert({ 
            key: 'site_status', 
            value: status, 
            updated_at: new Date().toISOString() 
          });

        if (error) throw error;
      }

      setSiteStatus(status);
      toast({
        title: status === 'active' ? '✅ Website Restored' : '🔴 Website Shut Down',
        description: status === 'active' 
          ? 'The website is now online and accessible to all users.' 
          : 'The website is now offline. Only admins can access it.',
      });
    } catch (error: any) {
      console.error('Failed to update site status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update site status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShutdown = () => updateSiteStatus('shutdown');
  const handleRestore = () => updateSiteStatus('active');

  const openResetDialog = () => {
    setResetStep('select');
    setConfirmationText('');
    setResetProgress([]);
  };

  const closeResetDialog = () => {
    setResetStep('closed');
    setConfirmationText('');
    setResetProgress([]);
  };

  const addProgress = (message: string) => {
    setResetProgress(prev => [...prev, message]);
  };

  const handleReset = async () => {
    setResetStep('processing');
    setResetProgress([]);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Clear page visits (logs)
      if (resetOptions.logs) {
        addProgress('🗑️ Clearing page visits...');
        const { error } = await supabase
          .from('page_visits')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error clearing page visits:', error);
        addProgress('✅ Page visits cleared');
      }

      // 2. Clear chat messages
      if (resetOptions.messages) {
        addProgress('🗑️ Clearing chat messages...');
        const { error } = await supabase
          .from('chat_messages')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error clearing chat messages:', error);
        addProgress('✅ Chat messages cleared');
      }

      // 3. Clear orders
      if (resetOptions.orders) {
        addProgress('🗑️ Clearing orders...');
        const { error } = await supabase
          .from('orders')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error clearing orders:', error);
        addProgress('✅ Orders cleared');
      }

      // 4. Clear announcements
      if (resetOptions.messages) {
        addProgress('🗑️ Clearing announcements...');
        const { error } = await supabase
          .from('announcements')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error clearing announcements:', error);
        addProgress('✅ Announcements cleared');
      }

      // 5. Clear vouchers
      if (resetOptions.inventory) {
        addProgress('🗑️ Clearing vouchers...');
        const { error } = await supabase
          .from('vouchers')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error clearing vouchers:', error);
        addProgress('✅ Vouchers cleared');
      }

      // 6. Reset inventory (set all products to out of stock, zero quantity)
      if (resetOptions.inventory) {
        addProgress('🗑️ Resetting inventory levels...');
        const { error } = await supabase
          .from('products')
          .update({ in_stock: false, stock_quantity: 0 })
          .neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) console.error('Error resetting inventory:', error);
        addProgress('✅ Inventory reset to zero');
      }

      // 7. Delete user accounts (profiles and roles) - EXCEPT super_admin
      if (resetOptions.accounts) {
        addProgress('🗑️ Removing customer accounts...');
        
        // Get all user IDs with super_admin role to exclude them
        const { data: superAdminRoles } = await supabase
          .from('user_roles')
          .select('user_id')
          .eq('role', 'super_admin');
        
        const superAdminIds = superAdminRoles?.map(r => r.user_id) || [];
        
        // Delete non-super_admin roles first
        if (superAdminIds.length > 0) {
          const { error: rolesError } = await supabase
            .from('user_roles')
            .delete()
            .not('user_id', 'in', `(${superAdminIds.join(',')})`);
          if (rolesError) console.error('Error clearing user roles:', rolesError);
        }
        
        // Delete profiles for non-super_admin users
        if (superAdminIds.length > 0) {
          const { error: profilesError } = await supabase
            .from('profiles')
            .delete()
            .not('user_id', 'in', `(${superAdminIds.join(',')})`);
          if (profilesError) console.error('Error clearing profiles:', profilesError);
        }
        
        addProgress('✅ Customer accounts cleared (Super Admins preserved)');
      }

      setResetStep('complete');
      
      toast({
        title: '🔄 System Reset Complete',
        description: 'Selected data has been cleared successfully.',
      });
    } catch (error: any) {
      console.error('Reset failed:', error);
      addProgress(`❌ Error: ${error.message}`);
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getSelectedOptionsText = () => {
    const selected = [];
    if (resetOptions.logs) selected.push('Page Visits');
    if (resetOptions.messages) selected.push('Messages & Announcements');
    if (resetOptions.orders) selected.push('Orders');
    if (resetOptions.inventory) selected.push('Inventory & Vouchers');
    if (resetOptions.accounts) selected.push('Customer Accounts');
    return selected.join(', ') || 'Nothing selected';
  };

  const hasAnyOptionSelected = Object.values(resetOptions).some(Boolean);
  const isConfirmationValid = confirmationText.toLowerCase() === 'reset';

  // Show nothing while checking role
  if (isCheckingRole) {
    return null;
  }

  // Don't render if not super admin (role-protected)
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <>
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="w-5 h-5" />
            Super Admin Controls
          </CardTitle>
          <CardDescription>
            <span className="flex items-center gap-2">
              Current Status:
              {siteStatus === 'active' ? (
                <span className="text-green-500 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Online
                </span>
              ) : (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Offline
                </span>
              )}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shutdown */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  disabled={siteStatus === 'shutdown' || isLoading}
                >
                  <Power className="w-4 h-4 mr-2" />
                  Shut Down Website
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Shut Down Website?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will make the website inaccessible to all users. 
                    They will see an error page instead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleShutdown}>Shut Down</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Restore */}
            <Button 
              variant="outline" 
              className="w-full border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={handleRestore}
              disabled={siteStatus === 'active' || isLoading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restore Website
            </Button>

            {/* Reset - Opens multi-step dialog */}
            <Button 
              variant="outline" 
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={openResetDialog}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Website
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            These controls are only available to Super Admin accounts
          </p>
        </CardContent>
      </Card>

      {/* Multi-step Reset Dialog */}
      <Dialog open={resetStep !== 'closed'} onOpenChange={(open) => !open && closeResetDialog()}>
        <DialogContent className="sm:max-w-md">
          {/* Step 1: Select what to reset */}
          {resetStep === 'select' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  System Reset - Step 1 of 2
                </DialogTitle>
                <DialogDescription>
                  Select what data you want to permanently delete.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="logs" 
                    checked={resetOptions.logs}
                    onCheckedChange={(checked) => 
                      setResetOptions(prev => ({ ...prev, logs: !!checked }))
                    }
                  />
                  <Label htmlFor="logs" className="cursor-pointer">
                    <span className="font-medium">Page Visits</span>
                    <p className="text-xs text-muted-foreground">Clear all visitor tracking data</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="messages" 
                    checked={resetOptions.messages}
                    onCheckedChange={(checked) => 
                      setResetOptions(prev => ({ ...prev, messages: !!checked }))
                    }
                  />
                  <Label htmlFor="messages" className="cursor-pointer">
                    <span className="font-medium">Messages & Announcements</span>
                    <p className="text-xs text-muted-foreground">Clear chat history and announcements</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="orders" 
                    checked={resetOptions.orders}
                    onCheckedChange={(checked) => 
                      setResetOptions(prev => ({ ...prev, orders: !!checked }))
                    }
                  />
                  <Label htmlFor="orders" className="cursor-pointer">
                    <span className="font-medium">Orders</span>
                    <p className="text-xs text-muted-foreground">Delete all order history</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="inventory" 
                    checked={resetOptions.inventory}
                    onCheckedChange={(checked) => 
                      setResetOptions(prev => ({ ...prev, inventory: !!checked }))
                    }
                  />
                  <Label htmlFor="inventory" className="cursor-pointer">
                    <span className="font-medium">Inventory & Vouchers</span>
                    <p className="text-xs text-muted-foreground">Reset all stock to zero, delete voucher history</p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 border-t pt-4">
                  <Checkbox 
                    id="accounts" 
                    checked={resetOptions.accounts}
                    onCheckedChange={(checked) => 
                      setResetOptions(prev => ({ ...prev, accounts: !!checked }))
                    }
                  />
                  <Label htmlFor="accounts" className="cursor-pointer">
                    <span className="font-medium text-destructive">Customer Accounts</span>
                    <p className="text-xs text-muted-foreground">Delete all customer profiles and roles (Super Admins are preserved)</p>
                  </Label>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeResetDialog}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setResetStep('confirm')}
                  disabled={!hasAnyOptionSelected}
                >
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 2: Confirm with text input */}
          {resetStep === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Confirm Reset - Step 2 of 2
                </DialogTitle>
                <DialogDescription>
                  This action is irreversible. Please confirm by typing "RESET" below.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive mb-2">You are about to delete:</p>
                  <p className="text-sm text-muted-foreground">{getSelectedOptionsText()}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-input">Type "RESET" to confirm</Label>
                  <Input 
                    id="confirm-input"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="RESET"
                    className="font-mono"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setResetStep('select')}>
                  Back
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReset}
                  disabled={!isConfirmationValid}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Execute Reset
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Step 3: Processing */}
          {resetStep === 'processing' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Resetting System...
                </DialogTitle>
                <DialogDescription>
                  Please wait while the selected data is being deleted.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-2 py-4 max-h-60 overflow-y-auto">
                {resetProgress.map((message, index) => (
                  <p key={index} className="text-sm font-mono">{message}</p>
                ))}
              </div>
            </>
          )}

          {/* Step 4: Complete */}
          {resetStep === 'complete' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-5 h-5" />
                  Reset Complete
                </DialogTitle>
                <DialogDescription>
                  The selected data has been successfully deleted.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-2 py-4 max-h-60 overflow-y-auto">
                {resetProgress.map((message, index) => (
                  <p key={index} className="text-sm font-mono">{message}</p>
                ))}
              </div>

              <DialogFooter>
                <Button onClick={closeResetDialog}>
                  Done
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SuperAdminControls;
