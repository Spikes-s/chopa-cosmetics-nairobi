import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ShieldX, Search, UserCog, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

const RolesManager = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [founderIds, setFounderIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    type: 'grant' | 'revoke';
    userId: string;
    email: string;
    role: 'admin' | 'super_admin';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Check if current user is super_admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsCheckingRole(false);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      setIsSuperAdmin(!!data);
      setIsCheckingRole(false);
    };

    checkSuperAdmin();
  }, [user]);

  // Fetch all users with their roles
  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (rolesError) {
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Merge profiles with roles
    const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
      user_id: profile.user_id,
      email: profile.email || 'No email',
      full_name: profile.full_name,
      roles: (roles || [])
        .filter(r => r.user_id === profile.user_id)
        .map(r => r.role),
    }));

    setUsers(usersWithRoles);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchUsers();
      // Fetch founder IDs
      supabase.from('founder_protection').select('user_id').then(({ data }) => {
        setFounderIds((data || []).map((d: any) => d.user_id));
      });
    }
  }, [isSuperAdmin]);

  const handleGrantRole = async () => {
    if (!pendingAction || pendingAction.type !== 'grant') return;
    
    setIsProcessing(true);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: pendingAction.userId,
        role: pendingAction.role,
      });

    if (error) {
      toast({
        title: 'Error',
        description: error.message.includes('duplicate') 
          ? 'User already has this role' 
          : 'Failed to grant role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role Granted',
        description: `${pendingAction.role} role granted to ${pendingAction.email}`,
      });
      fetchUsers();
    }
    
    setIsProcessing(false);
    setPendingAction(null);
  };

  const handleRevokeRole = async () => {
    if (!pendingAction || pendingAction.type !== 'revoke') return;
    
    // Prevent revoking own super_admin role
    if (pendingAction.userId === user?.id && pendingAction.role === 'super_admin') {
      toast({
        title: 'Cannot Revoke',
        description: 'You cannot revoke your own super_admin role',
        variant: 'destructive',
      });
      setPendingAction(null);
      return;
    }
    
    setIsProcessing(true);
    
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', pendingAction.userId)
      .eq('role', pendingAction.role);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke role',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Role Revoked',
        description: `${pendingAction.role} role revoked from ${pendingAction.email}`,
      });
      fetchUsers();
    }
    
    setIsProcessing(false);
    setPendingAction(null);
  };

  if (isCheckingRole) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldX className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
          <p className="text-muted-foreground">
            Only Super Admins can manage user roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6" />
            Roles Manager
          </h2>
          <p className="text-muted-foreground">Grant or revoke admin roles (Super Admin only)</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredUsers.map((userItem) => (
          <Card key={userItem.user_id} className="glass-card">
            <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {userItem.roles.includes('super_admin') ? (
                    <ShieldCheck className="w-5 h-5 text-destructive" />
                  ) : userItem.roles.includes('admin') ? (
                    <Shield className="w-5 h-5 text-primary" />
                  ) : (
                    <UserCog className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{userItem.full_name || 'Unnamed User'}</h3>
                  <p className="text-sm text-muted-foreground">{userItem.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userItem.roles.length === 0 && (
                      <Badge variant="outline" className="text-xs">customer</Badge>
                    )}
                    {userItem.roles.map(role => (
                      <Badge key={role} variant={getRoleBadgeVariant(role)} className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Grant admin role */}
                {!userItem.roles.includes('admin') && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingAction({
                      type: 'grant',
                      userId: userItem.user_id,
                      email: userItem.email,
                      role: 'admin',
                    })}
                  >
                    <Shield className="w-4 h-4 mr-1" />
                    Grant Admin
                  </Button>
                )}
                
                {/* Revoke admin role */}
                {userItem.roles.includes('admin') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingAction({
                      type: 'revoke',
                      userId: userItem.user_id,
                      email: userItem.email,
                      role: 'admin',
                    })}
                  >
                    <ShieldX className="w-4 h-4 mr-1" />
                    Revoke Admin
                  </Button>
                )}
                
                {/* Grant super_admin role (only for non-super-admins) */}
                {!userItem.roles.includes('super_admin') && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setPendingAction({
                      type: 'grant',
                      userId: userItem.user_id,
                      email: userItem.email,
                      role: 'super_admin',
                    })}
                  >
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    Grant Super Admin
                  </Button>
                )}
                
                {/* Revoke super_admin role (cannot revoke own or founder) */}
                {userItem.roles.includes('super_admin') && userItem.user_id !== user?.id && !founderIds.includes(userItem.user_id) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingAction({
                      type: 'revoke',
                      userId: userItem.user_id,
                      email: userItem.email,
                      role: 'super_admin',
                    })}
                  >
                    <ShieldX className="w-4 h-4 mr-1" />
                    Revoke Super Admin
                  </Button>
                )}
                {founderIds.includes(userItem.user_id) && (
                  <Badge variant="outline" className="text-xs border-primary text-primary">
                    <Shield className="w-3 h-3 mr-1" /> Founder
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredUsers.length === 0 && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              No users found matching your search.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'grant' ? 'Grant Role?' : 'Revoke Role?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'grant' 
                ? `This will grant the "${pendingAction.role}" role to ${pendingAction.email}. They will have access to admin functionality.`
                : `This will revoke the "${pendingAction?.role}" role from ${pendingAction?.email}. They will lose access to admin functionality.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={pendingAction?.type === 'grant' ? handleGrantRole : handleRevokeRole}
              disabled={isProcessing}
              className={pendingAction?.type === 'revoke' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {pendingAction?.type === 'grant' ? 'Grant Role' : 'Revoke Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesManager;
