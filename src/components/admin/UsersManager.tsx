import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { User, Mail, Phone, Calendar, ShoppingBag } from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role?: string;
  order_count?: number;
}

const UsersManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
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

    // Fetch user roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Fetch order counts per user
    const { data: orders } = await supabase
      .from('orders')
      .select('user_id');

    // Combine data
    const usersWithData = (profiles || []).map(profile => {
      const userRole = roles?.find(r => r.user_id === profile.user_id);
      const orderCount = orders?.filter(o => o.user_id === profile.user_id).length || 0;
      
      return {
        ...profile,
        role: userRole?.role || 'customer',
        order_count: orderCount,
      };
    });

    setUsers(usersWithData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Registered Users ({users.length})</h2>
      </div>

      {users.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No registered users yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map(user => (
            <Card key={user.id} className="glass-card">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                                    <div>
                                      <h3 className="font-semibold text-foreground">
                                        {user.full_name || 'No name provided'}
                                      </h3>
                                      {user.email && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                          <Mail className="w-3 h-3" /> {user.email}
                                        </p>
                                      )}
                                      {user.phone && (
                                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                          <Phone className="w-3 h-3" /> {user.phone}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <Calendar className="w-3 h-3" /> 
                                        Joined: {format(new Date(user.created_at), 'PP')}
                                      </p>
                                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? 'Admin' : 'Customer'}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <ShoppingBag className="w-3 h-3" />
                      {user.order_count} orders
                    </div>
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

export default UsersManager;
