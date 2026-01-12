import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { FileText, Printer, Download, DollarSign, CreditCard, Banknote, Percent, TrendingUp, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ReportData {
  totalSales: number;
  cashTotal: number;
  mpesaTotal: number;
  totalDiscounts: number;
  totalProfit: number;
  wholesaleSales: number;
  retailSales: number;
  orderCount: number;
  itemsSold: number;
}

const EndOfDayReport = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setIsLoading(true);
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    try {
      // Fetch today's POS orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('sales_channel', 'pos')
        .eq('payment_status', 'confirmed')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;

      // Fetch products for cost price
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price, retail_price, wholesale_price');

      const productCostMap = new Map(products?.map(p => [p.id, p.cost_price || 0]) || []);

      let totalSales = 0;
      let cashTotal = 0;
      let mpesaTotal = 0;
      let totalDiscounts = 0;
      let totalCost = 0;
      let wholesaleSales = 0;
      let retailSales = 0;
      let itemsSold = 0;

      orders?.forEach(order => {
        totalSales += order.total || 0;
        totalDiscounts += order.discount_amount || 0;

        if (order.payment_method === 'cash') {
          cashTotal += order.total || 0;
        } else if (order.payment_method === 'mpesa') {
          mpesaTotal += order.total || 0;
        }

        // Parse items to calculate costs and categorize sales
        const items = order.items as any[];
        items?.forEach((item: any) => {
          const costPrice = productCostMap.get(item.productId) || 0;
          totalCost += costPrice * item.quantity;
          itemsSold += item.quantity;

          if (item.priceType === 'wholesale') {
            wholesaleSales += item.subtotal || (item.price * item.quantity);
          } else {
            retailSales += item.subtotal || (item.price * item.quantity);
          }
        });
      });

      const totalProfit = totalSales - totalCost;

      setReportData({
        totalSales,
        cashTotal,
        mpesaTotal,
        totalDiscounts,
        totalProfit,
        wholesaleSales,
        retailSales,
        orderCount: orders?.length || 0,
        itemsSold,
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateReport();
    }
  }, [isOpen]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && receiptRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>End of Day Report - ${format(new Date(), 'PP')}</title>
            <style>
              body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
              .row { display: flex; justify-content: space-between; padding: 5px 0; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 1.2em; }
              .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
            </style>
          </head>
          <body>
            ${receiptRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownload = () => {
    if (!reportData) return;

    const reportText = `
CHOPA COSMETICS - END OF DAY REPORT
====================================
Date: ${format(new Date(), 'PPP')}
Time: ${format(new Date(), 'pp')}

SALES SUMMARY
-------------
Total Sales: Ksh ${reportData.totalSales.toLocaleString()}
Orders: ${reportData.orderCount}
Items Sold: ${reportData.itemsSold}

PAYMENT BREAKDOWN
-----------------
Cash: Ksh ${reportData.cashTotal.toLocaleString()}
M-Pesa: Ksh ${reportData.mpesaTotal.toLocaleString()}

SALES TYPE
----------
Retail Sales: Ksh ${reportData.retailSales.toLocaleString()}
Wholesale Sales: Ksh ${reportData.wholesaleSales.toLocaleString()}

FINANCIALS
----------
Total Discounts: Ksh ${reportData.totalDiscounts.toLocaleString()}
Total Profit: Ksh ${reportData.totalProfit.toLocaleString()}

====================================
Generated by Chopa POS System
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EOD-Report-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          End of Day Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>End of Day Report</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : reportData ? (
          <div>
            {/* Receipt Preview */}
            <div ref={receiptRef} className="bg-white text-black p-4 rounded-lg font-mono text-sm">
              <div className="header text-center border-b-2 border-dashed border-black pb-2 mb-4">
                <h2 className="text-lg font-bold">CHOPA COSMETICS</h2>
                <p>End of Day Report</p>
                <p>{format(new Date(), 'PPP')}</p>
                <p>{format(new Date(), 'pp')}</p>
              </div>

              <div className="space-y-2">
                <div className="row flex justify-between">
                  <span>Total Sales:</span>
                  <span className="font-bold">Ksh {reportData.totalSales.toLocaleString()}</span>
                </div>
                <div className="row flex justify-between text-xs">
                  <span>Orders: {reportData.orderCount}</span>
                  <span>Items: {reportData.itemsSold}</span>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <p className="font-bold">Payment Breakdown:</p>
                <div className="row flex justify-between">
                  <span>💵 Cash:</span>
                  <span>Ksh {reportData.cashTotal.toLocaleString()}</span>
                </div>
                <div className="row flex justify-between">
                  <span>📱 M-Pesa:</span>
                  <span>Ksh {reportData.mpesaTotal.toLocaleString()}</span>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <p className="font-bold">Sales Type:</p>
                <div className="row flex justify-between">
                  <span>Retail:</span>
                  <span>Ksh {reportData.retailSales.toLocaleString()}</span>
                </div>
                <div className="row flex justify-between">
                  <span>Wholesale:</span>
                  <span>Ksh {reportData.wholesaleSales.toLocaleString()}</span>
                </div>

                <div className="divider border-t border-dashed border-black my-2" />

                <div className="row flex justify-between">
                  <span>Total Discounts:</span>
                  <span className="text-orange-600">-Ksh {reportData.totalDiscounts.toLocaleString()}</span>
                </div>

                <div className="divider border-t-2 border-dashed border-black my-2" />

                <div className="row flex justify-between total text-lg font-bold">
                  <span>💰 PROFIT:</span>
                  <span className="text-green-600">Ksh {reportData.totalProfit.toLocaleString()}</span>
                </div>

                <div className="footer text-center mt-4 text-xs">
                  <p>Generated by Chopa POS</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EndOfDayReport;
