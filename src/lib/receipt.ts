/**
 * Receipt generation & printing utility.
 * Generates an HTML receipt, attempts window.print(), falls back to PDF download.
 */

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  color?: string;
  variant?: string;
  image?: string;
}

interface ReceiptData {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: ReceiptItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: string;
  deliveryAddress?: string;
  pickupDate?: string;
  pickupTime?: string;
  mpesaCode?: string;
  paymentStatus: string;
  orderDate: string;
  receiptNumber?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildReceiptHtml(data: ReceiptData): string {
  const itemRows = data.items.map(item => {
    const variantInfo = [item.color, item.variant].filter(Boolean).join(', ');
    return `
      <tr>
        <td style="padding:6px 4px;border-bottom:1px solid #eee;">
          ${item.image ? `<img src="${escapeHtml(item.image)}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:6px;" />` : ''}
          <span>${escapeHtml(item.name)}</span>
          ${variantInfo ? `<br/><span style="font-size:11px;color:#888;">${escapeHtml(variantInfo)}</span>` : ''}
        </td>
        <td style="padding:6px 4px;text-align:center;border-bottom:1px solid #eee;">${item.quantity}</td>
        <td style="padding:6px 4px;text-align:right;border-bottom:1px solid #eee;">Ksh ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt - ${escapeHtml(data.orderId.slice(0, 8).toUpperCase())}</title>
  <style>
    @media print {
      body { margin: 0; font-size: 12px; }
      .no-print { display: none !important; }
      @page { size: 80mm auto; margin: 4mm; }
    }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 320px; margin: 0 auto; padding: 16px; color: #333; }
    .header { text-align: center; margin-bottom: 12px; }
    .header h1 { font-size: 18px; margin: 0 0 4px; color: #d63384; }
    .header p { font-size: 11px; margin: 2px 0; color: #666; }
    .divider { border-top: 1px dashed #ccc; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 4px; border-bottom: 2px solid #333; font-size: 11px; text-transform: uppercase; }
    .totals td { padding: 4px; font-size: 12px; }
    .total-row { font-weight: bold; font-size: 14px; }
    .footer { text-align: center; font-size: 10px; color: #999; margin-top: 12px; }
    .btn-row { text-align: center; margin: 16px 0; }
    .btn-row button { padding: 10px 24px; font-size: 14px; border: none; border-radius: 8px; cursor: pointer; margin: 0 4px; }
    .btn-print { background: #d63384; color: #fff; }
    .btn-pdf { background: #6c757d; color: #fff; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Chopa Cosmetics</h1>
    <p>Beauty At Your Proximity</p>
    <p style="font-size:10px;color:#999;">Till: 4623226 (M-Pesa Buy Goods)</p>
  </div>
  <div class="divider"></div>

  <div style="font-size:12px;margin-bottom:8px;">
    <strong>Order:</strong> #${escapeHtml(data.orderId.slice(0, 8).toUpperCase())}<br/>
    ${data.receiptNumber ? `<strong>Receipt:</strong> ${escapeHtml(data.receiptNumber)}<br/>` : ''}
    <strong>Date:</strong> ${escapeHtml(data.orderDate)}<br/>
    <strong>Customer:</strong> ${escapeHtml(data.customerName)}<br/>
    <strong>Phone:</strong> ${escapeHtml(data.customerPhone)}
    ${data.customerEmail ? `<br/><strong>Email:</strong> ${escapeHtml(data.customerEmail)}` : ''}
  </div>
  <div class="divider"></div>

  <table>
    <thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Amount</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td style="text-align:right;">Ksh ${data.subtotal.toLocaleString()}</td></tr>
    ${data.deliveryFee > 0 ? `<tr><td>Delivery Fee</td><td style="text-align:right;">Ksh ${data.deliveryFee.toLocaleString()}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">Ksh ${data.total.toLocaleString()}</td></tr>
  </table>
  <div class="divider"></div>

  <div style="font-size:11px;">
    <strong>Payment:</strong> ${escapeHtml(data.paymentStatus.replace(/_/g, ' '))}
    ${data.mpesaCode ? `<br/><strong>M-Pesa Code:</strong> ${escapeHtml(data.mpesaCode)}` : ''}
    <br/><strong>Delivery:</strong> ${escapeHtml(data.deliveryType)}
    ${data.deliveryAddress ? `<br/><strong>Address:</strong> ${escapeHtml(data.deliveryAddress)}` : ''}
    ${data.pickupDate ? `<br/><strong>Pickup:</strong> ${escapeHtml(data.pickupDate)} at ${escapeHtml(data.pickupTime || '')}` : ''}
  </div>

  <div class="footer">
    <p>Thank you for shopping with Chopa Cosmetics!</p>
    <p>www.chopacosmetics.lovable.app</p>
  </div>

  <div class="btn-row no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print</button>
    <button class="btn-pdf" onclick="window.print()">📄 Save as PDF</button>
  </div>
</body>
</html>`;
}

export function printReceipt(order: {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_type: string;
  delivery_address?: string | null;
  pickup_date?: string | null;
  pickup_time?: string | null;
  mpesa_code?: string | null;
  payment_status: string;
  created_at: string;
  receipt_number?: string | null;
}) {
  const items: ReceiptItem[] = (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
    name: item.name || 'Unknown',
    quantity: item.quantity || 1,
    price: item.price || 0,
    color: item.color,
    variant: item.variant,
    image: item.image,
  }));

  const receiptData: ReceiptData = {
    orderId: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email || undefined,
    items,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee,
    total: order.total,
    deliveryType: order.delivery_type,
    deliveryAddress: order.delivery_address || undefined,
    pickupDate: order.pickup_date || undefined,
    pickupTime: order.pickup_time || undefined,
    mpesaCode: order.mpesa_code || undefined,
    paymentStatus: order.payment_status,
    orderDate: new Date(order.created_at).toLocaleString(),
    receiptNumber: order.receipt_number || undefined,
  };

  const html = buildReceiptHtml(receiptData);

  // Open in new window for printing
  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Auto-trigger print after a brief delay for rendering
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.id.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
