import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Power, RefreshCw, Trash2, Shield, CheckCircle } from 'lucide-react';
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

const SUPER_ADMIN_EMAIL = 'superadmin420.co.ke';
const SUPER_ADMIN_PASSWORD = 'GHOSTMODZTECH101';

interface SiteControlsProps {
  userEmail?: string;
}

const SuperAdminControls = ({ userEmail }: SiteControlsProps) => {
  const { toast } = useToast();
  const [isVerified, setIsVerified] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [siteStatus, setSiteStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is super admin
  const isSuperAdmin = userEmail === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    const fetchSiteStatus = async () => {
      const { data } = await supabase
        .from('site_controls')
        .select('value')
        .eq('key', 'site_status')
        .single();
      
      if (data) {
        setSiteStatus(data.value || 'active');
      }
    };

    fetchSiteStatus();
  }, []);

  const handleVerify = () => {
    if (verifyPassword === SUPER_ADMIN_PASSWORD) {
      setIsVerified(true);
      toast({
        title: 'Access Granted',
        description: 'Super Admin privileges activated',
      });
    } else {
      toast({
        title: 'Access Denied',
        description: 'Invalid password',
        variant: 'destructive',
      });
    }
    setVerifyPassword('');
  };

  const updateSiteStatus = async (status: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('site_controls')
        .update({ value: status, updated_at: new Date().toISOString() })
        .eq('key', 'site_status');

      if (error) throw error;

      setSiteStatus(status);
      toast({
        title: 'Site Status Updated',
        description: `Website is now ${status === 'active' ? 'online' : 'offline'}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
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

  if (!isSuperAdmin) {
    return null;
  }

  if (!isVerified) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="w-5 h-5" />
            Super Admin Access
          </CardTitle>
          <CardDescription>
            Enter your Super Admin password to access system controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter Super Admin password"
              value={verifyPassword}
              onChange={(e) => setVerifyPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            <Button onClick={handleVerify}>Verify</Button>
          </div>
        </CardContent>
      </Card>
    );
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
          These controls are only available to the Super Admin account
        </p>
      </CardContent>
    </Card>
  );
};

export default SuperAdminControls;
