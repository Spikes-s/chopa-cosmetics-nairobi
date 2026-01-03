import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Package, ShoppingBag, BarChart3, MessageSquare, Settings } from 'lucide-react';
import ProductsManager from '@/components/admin/ProductsManager';
import OrdersManager from '@/components/admin/OrdersManager';
import SalesAnalytics from '@/components/admin/SalesAnalytics';
import MessagesManager from '@/components/admin/MessagesManager';
import SettingsManager from '@/components/admin/SettingsManager';

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your store</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2 h-auto bg-muted/50 p-2">
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Products</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersManager />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <SalesAnalytics />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <MessagesManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
