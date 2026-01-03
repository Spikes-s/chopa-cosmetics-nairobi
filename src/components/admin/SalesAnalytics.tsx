import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { TrendingUp, Package, ShoppingBag, DollarSign } from 'lucide-react';

interface Order {
  total: number;
  created_at: string;
  order_status: string;
}

const SalesAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, order_status')
        .eq('payment_status', 'confirmed');

      if (!error && data) {
        setOrders(data);
      }
      setIsLoading(false);
    };

    fetchOrders();
  }, []);

  const completedOrders = orders.filter(o => o.order_status === 'completed');
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const getDailyData = () => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => format(new Date(o.created_at), 'yyyy-MM-dd') === dayStr);
      return {
        name: format(day, 'EEE'),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: dayOrders.length,
      };
    });
  };

  const getWeeklyData = () => {
    const last4Weeks = eachWeekOfInterval({
      start: subDays(new Date(), 27),
      end: new Date(),
    });

    return last4Weeks.map(week => {
      const weekStart = startOfWeek(week);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= weekStart && orderDate <= weekEnd;
      });

      return {
        name: format(weekStart, 'MMM d'),
        revenue: weekOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: weekOrders.length,
      };
    });
  };

  const getMonthlyData = () => {
    const last6Months = eachMonthOfInterval({
      start: subDays(new Date(), 180),
      end: new Date(),
    });

    return last6Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      return {
        name: format(month, 'MMM'),
        revenue: monthOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: monthOrders.length,
      };
    });
  };

  const getYearlyData = () => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];

    return years.map(year => {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate >= yearStart && orderDate <= yearEnd;
      });

      return {
        name: year.toString(),
        revenue: yearOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: yearOrders.length,
      };
    });
  };

  const getChartData = () => {
    switch (activeTab) {
      case 'daily':
        return getDailyData();
      case 'weekly':
        return getWeeklyData();
      case 'monthly':
        return getMonthlyData();
      case 'yearly':
        return getYearlyData();
      default:
        return getDailyData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">Ksh {totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{completedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Order</p>
                <p className="text-xl font-bold">Ksh {Math.round(averageOrderValue).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>

            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`Ksh ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Orders Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Order Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="orders" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: 'hsl(var(--accent))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesAnalytics;
