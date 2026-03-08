import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Gift, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface WalletData {
  balance: number;
  total_earned: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const typeIcons: Record<string, any> = {
  cashback: Gift,
  refund: RefreshCw,
  spend: ArrowUpRight,
  topup: ArrowDownLeft,
};

const typeColors: Record<string, string> = {
  cashback: 'text-green-500',
  refund: 'text-blue-500',
  spend: 'text-red-500',
  topup: 'text-green-500',
};

const Wallet = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWallet = async () => {
      const { data: walletData } = await supabase
        .from('customer_wallets')
        .select('balance, total_earned, total_spent')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletData) setWallet(walletData as any);
      else setWallet({ balance: 0, total_earned: 0, total_spent: 0 });

      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) setTransactions(txData as any);
      setLoading(false);
    };

    fetchWallet();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <WalletIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
        <h2 className="text-2xl font-display font-bold mb-2">My Wallet</h2>
        <p className="text-muted-foreground mb-4">Sign in to view your wallet</p>
        <Button asChild><Link to="/auth">Sign In</Link></Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-display font-bold text-foreground mb-8">My Wallet</h1>

      {/* Balance Card */}
      <Card className="gold-glow border-accent/20 mb-8">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-3xl font-display font-bold text-foreground">
                Ksh {wallet?.balance?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="font-semibold text-green-600">Ksh {wallet?.total_earned?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="font-semibold text-primary">Ksh {wallet?.total_spent?.toLocaleString() || '0'}</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-accent/10 rounded-lg">
            <p className="text-sm text-center text-foreground">
              💰 Spend <strong>Ksh 5,000+</strong> → Get <strong>Ksh 200</strong> cashback!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet. Make a purchase to earn cashback!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const Icon = typeIcons[tx.type] || ArrowUpRight;
                const color = typeColors[tx.type] || 'text-foreground';
                const isPositive = tx.type === 'cashback' || tx.type === 'refund' || tx.type === 'topup';
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.description || formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                      {isPositive ? '+' : '-'}Ksh {Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Wallet;
