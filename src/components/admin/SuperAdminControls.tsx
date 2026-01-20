import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface SiteControlsProps {
  userEmail?: string;
}

const SuperAdminControls = ({ userEmail }: SiteControlsProps) => {
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [siteStatus, setSiteStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(false);

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

  const handleReset = async () => {
    setIsLoading(true);
    try {
      // Clear chat messages
      await supabase.from('chat_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Set all products to out of stock
      await supabase.from('products').update({ in_stock: false, stock_quantity: 0 });
      
      // Clear orders (except keep structure)
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear announcements
      await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear vouchers
      await supabase.from('vouchers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast({
        title: 'System Reset Complete',
        description: 'All data has been cleared and inventory reset',
      });
    } catch (error: any) {
      toast({
        title: 'Reset Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show nothing while checking role
  if (isCheckingRole) {
    return null;
  }

  // Don't render if not super admin (role-protected)
  if (!isSuperAdmin) {
    return null;
  }

  return (
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

          {/* Reset */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Reset Website
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive">
                  ⚠️ Complete System Reset
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>This action will permanently delete:</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>All chat messages and logs</li>
                    <li>All orders</li>
                    <li>All announcements</li>
                    <li>All vouchers</li>
                    <li>Set all inventory to out-of-stock</li>
                  </ul>
                  <p className="font-bold text-destructive">This action cannot be undone!</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="bg-destructive">
                  Yes, Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          These controls are only available to Super Admin accounts
        </p>
      </CardContent>
    </Card>
  );
};

export default SuperAdminControls;
