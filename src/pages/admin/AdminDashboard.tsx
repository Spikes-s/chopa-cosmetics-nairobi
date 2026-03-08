import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAdminAutoLogout from '@/hooks/useAdminAutoLogout';
import { useAuth } from '@/context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Package, ShoppingBag, BarChart3, MessageSquare, Settings, Users, Home, Monitor, RotateCcw, FolderTree, UserCog, MapPin, Gift } from 'lucide-react';
import ProductsManager from '@/components/admin/ProductsManager';
import OrdersManager from '@/components/admin/OrdersManager';
import SalesAnalytics from '@/components/admin/SalesAnalytics';
import MessagesManager from '@/components/admin/MessagesManager';
import SettingsManager from '@/components/admin/SettingsManager';
import UsersManager from '@/components/admin/UsersManager';
import POSSystem from '@/components/admin/POSSystem';
import ReturnsManager from '@/components/admin/ReturnsManager';
import CategoriesManager from '@/components/admin/CategoriesManager';
import RolesManager from '@/components/admin/RolesManager';
import BranchesManager from '@/components/admin/BranchesManager';
import BundleDealsManager from '@/components/admin/BundleDealsManager';
import ThemeToggle from '@/components/ThemeToggle';
import { VisitorCounter } from '@/components/admin/VisitorCounter';

const AdminDashboard = () => {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  useAdminAutoLogout();

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
    <div className="min-h-screen mirage-bg pt-4 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your store</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
                <Home className="w-4 h-4" />
                View Store
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
          
          {/* Visitor Counter */}
          <div className="flex justify-end">
            <VisitorCounter />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 h-auto bg-muted/50 p-2 justify-start">
            <TabsTrigger value="pos" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <Monitor className="w-4 h-4" />
              <span>POS</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <ShoppingBag className="w-4 h-4" />
              <span>Orders</span>
            </TabsTrigger>
            <TabsTrigger value="returns" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <RotateCcw className="w-4 h-4" />
              <span>Returns</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <Package className="w-4 h-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <FolderTree className="w-4 h-4" />
              <span>Categories</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <Users className="w-4 h-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
            <TabsTrigger value="branches" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <MapPin className="w-4 h-4" />
              <span>Locations</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <UserCog className="w-4 h-4" />
              <span>Roles</span>
            </TabsTrigger>
            <TabsTrigger value="bundles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4">
              <Gift className="w-4 h-4" />
              <span>Bundles</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pos" className="space-y-4">
            <POSSystem />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-4">
            <SalesAnalytics />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <OrdersManager />
          </TabsContent>

          <TabsContent value="returns" className="space-y-4">
            <ReturnsManager />
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UsersManager />
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <MessagesManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsManager />
          </TabsContent>

          <TabsContent value="branches" className="space-y-4">
            <BranchesManager />
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <RolesManager />
          </TabsContent>

          <TabsContent value="bundles" className="space-y-4">
            <BundleDealsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
