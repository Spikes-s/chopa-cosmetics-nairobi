/**
 * Receipt generation & printing utility.
 * Generates an HTML receipt for printing, with real PDF download fallback via jspdf.
 */
import jsPDF from 'jspdf';

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
  paymentMethod?: string;
  cashReceived?: number;
  changeGiven?: number;
  discountAmount?: number;
  taxAmount?: number;
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
  <title>Receipt - ${escapeHtml(data.receiptNumber || data.orderId.slice(0, 8).toUpperCase())}</title>
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
    ${data.receiptNumber ? `<strong>Receipt:</strong> ${escapeHtml(data.receiptNumber)}<br/>` : ''}
    <strong>Order:</strong> #${escapeHtml(data.orderId.slice(0, 8).toUpperCase())}<br/>
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
    ${data.discountAmount && data.discountAmount > 0 ? `<tr><td>Discount</td><td style="text-align:right;">-Ksh ${data.discountAmount.toLocaleString()}</td></tr>` : ''}
    ${data.taxAmount && data.taxAmount > 0 ? `<tr><td>Tax</td><td style="text-align:right;">Ksh ${data.taxAmount.toLocaleString()}</td></tr>` : ''}
    ${data.deliveryFee > 0 ? `<tr><td>Delivery Fee</td><td style="text-align:right;">Ksh ${data.deliveryFee.toLocaleString()}</td></tr>` : ''}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right;">Ksh ${data.total.toLocaleString()}</td></tr>
  </table>
  <div class="divider"></div>

  <div style="font-size:11px;">
    <strong>Payment:</strong> ${escapeHtml((data.paymentMethod || data.paymentStatus).replace(/_/g, ' '))}
    ${data.mpesaCode ? `<br/><strong>M-Pesa Code:</strong> ${escapeHtml(data.mpesaCode)}` : ''}
    ${data.cashReceived ? `<br/><strong>Cash Received:</strong> Ksh ${data.cashReceived.toLocaleString()}` : ''}
    ${data.changeGiven ? `<br/><strong>Change:</strong> Ksh ${data.changeGiven.toLocaleString()}` : ''}
    <br/><strong>Delivery:</strong> ${escapeHtml(data.deliveryType)}
    ${data.deliveryAddress ? `<br/><strong>Address:</strong> ${escapeHtml(data.deliveryAddress)}` : ''}
    ${data.pickupDate ? `<br/><strong>Pickup:</strong> ${escapeHtml(data.pickupDate)} at ${escapeHtml(data.pickupTime || '')}` : ''}
  </div>

  <div class="footer">
    <p>Thank you for shopping with Chopa Cosmetics!</p>
    <p>www.chopacosmetics.lovable.app</p>
  </div>
</body>
</html>`;
}

function buildReceiptData(order: any): ReceiptData {
  const items: ReceiptItem[] = (Array.isArray(order.items) ? order.items : []).map((item: any) => ({
    name: item.name || 'Unknown',
    quantity: item.quantity || 1,
    price: item.price || 0,
    color: item.color,
    variant: item.variant,
    image: item.image,
  }));

  return {
    orderId: order.id,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email || undefined,
    items,
    subtotal: order.subtotal,
    deliveryFee: order.delivery_fee || 0,
    total: order.total,
    deliveryType: order.delivery_type,
    deliveryAddress: order.delivery_address || undefined,
    pickupDate: order.pickup_date || undefined,
    pickupTime: order.pickup_time || undefined,
    mpesaCode: order.mpesa_code || undefined,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method || undefined,
    orderDate: new Date(order.created_at).toLocaleString(),
    receiptNumber: order.receipt_number || undefined,
    cashReceived: order.cashReceived || undefined,
    changeGiven: order.changeGiven || order.change_given || undefined,
    discountAmount: order.discount_amount || undefined,
    taxAmount: order.tax_amount || undefined,
  };
}

/**
 * Print receipt via browser print dialog.
 */
export function printReceipt(order: any) {
  const data = buildReceiptData(order);
  const html = buildReceiptHtml(data);

  const printWindow = window.open('', '_blank', 'width=400,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    // Fallback to PDF
    downloadReceiptPDF(order);
  }
}

/**
 * Generate and download a real PDF receipt using jsPDF.
 */
export function downloadReceiptPDF(order: any) {
  const data = buildReceiptData(order);
  const doc = new jsPDF({ unit: 'mm', format: [80, 200] }); // 80mm thermal width

  const pageWidth = 80;
  const margin = 4;
  const contentWidth = pageWidth - margin * 2;
  let y = 8;

  // Helper
  const addText = (text: string, x: number, _y: number, opts?: { fontSize?: number; fontStyle?: string; align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
    doc.setFontSize(opts?.fontSize || 8);
    if (opts?.fontStyle) doc.setFont('helvetica', opts.fontStyle);
    else doc.setFont('helvetica', 'normal');
    
    const align = opts?.align || 'left';
    let finalX = x;
    if (align === 'center') finalX = pageWidth / 2;
    if (align === 'right') finalX = pageWidth - margin;

    doc.text(text, finalX, _y, { align, maxWidth: opts?.maxWidth || contentWidth });
  };

  const addDashedLine = (_y: number) => {
    doc.setDrawColor(180);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(margin, _y, pageWidth - margin, _y);
    doc.setLineDashPattern([], 0);
  };

  // Header
  addText('Chopa Cosmetics', 0, y, { fontSize: 14, fontStyle: 'bold', align: 'center' });
  y += 4;
  addText('Beauty At Your Proximity', 0, y, { fontSize: 7, align: 'center' });
  y += 3;
  addText('Till: 4623226 (M-Pesa Buy Goods)', 0, y, { fontSize: 6, align: 'center' });
  y += 4;
  addDashedLine(y); y += 3;

  // Order info
  if (data.receiptNumber) {
    addText(`Receipt: ${data.receiptNumber}`, margin, y, { fontSize: 8, fontStyle: 'bold' });
    y += 3.5;
  }
  addText(`Order: #${data.orderId.slice(0, 8).toUpperCase()}`, margin, y, { fontSize: 7 });
  y += 3;
  addText(`Date: ${data.orderDate}`, margin, y, { fontSize: 7 });
  y += 3;
  addText(`Customer: ${data.customerName}`, margin, y, { fontSize: 7 });
  y += 3;
  addText(`Phone: ${data.customerPhone}`, margin, y, { fontSize: 7 });
  y += 3;
  if (data.customerEmail) {
    addText(`Email: ${data.customerEmail}`, margin, y, { fontSize: 7 });
    y += 3;
  }

  addDashedLine(y); y += 3;

  // Items header
  addText('Item', margin, y, { fontSize: 7, fontStyle: 'bold' });
  addText('Qty', 52, y, { fontSize: 7, fontStyle: 'bold', align: 'center' });
  addText('Amount', 0, y, { fontSize: 7, fontStyle: 'bold', align: 'right' });
  y += 1;
  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // Items
  for (const item of data.items) {
    const variantInfo = [item.color, item.variant].filter(Boolean).join(', ');
    const itemName = item.name.length > 22 ? item.name.slice(0, 22) + '…' : item.name;
    addText(itemName, margin, y, { fontSize: 7 });
    addText(String(item.quantity), 52, y, { fontSize: 7, align: 'center' });
    addText(`Ksh ${(item.price * item.quantity).toLocaleString()}`, 0, y, { fontSize: 7, align: 'right' });
    y += 3;
    if (variantInfo) {
      addText(variantInfo, margin + 2, y, { fontSize: 6 });
      y += 2.5;
    }
  }

  addDashedLine(y); y += 3;

  // Totals
  addText('Subtotal', margin, y, { fontSize: 7 });
  addText(`Ksh ${data.subtotal.toLocaleString()}`, 0, y, { fontSize: 7, align: 'right' });
  y += 3;

  if (data.discountAmount && data.discountAmount > 0) {
    addText('Discount', margin, y, { fontSize: 7 });
    addText(`-Ksh ${data.discountAmount.toLocaleString()}`, 0, y, { fontSize: 7, align: 'right' });
    y += 3;
  }

  if (data.taxAmount && data.taxAmount > 0) {
    addText('Tax', margin, y, { fontSize: 7 });
    addText(`Ksh ${data.taxAmount.toLocaleString()}`, 0, y, { fontSize: 7, align: 'right' });
    y += 3;
  }

  if (data.deliveryFee > 0) {
    addText('Delivery Fee', margin, y, { fontSize: 7 });
    addText(`Ksh ${data.deliveryFee.toLocaleString()}`, 0, y, { fontSize: 7, align: 'right' });
    y += 3;
  }

  doc.setDrawColor(0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;
  addText('TOTAL', margin, y, { fontSize: 10, fontStyle: 'bold' });
  addText(`Ksh ${data.total.toLocaleString()}`, 0, y, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  y += 4;
  addDashedLine(y); y += 3;

  // Payment info
  addText(`Payment: ${(data.paymentMethod || data.paymentStatus).replace(/_/g, ' ').toUpperCase()}`, margin, y, { fontSize: 7 });
  y += 3;
  if (data.mpesaCode) {
    addText(`M-Pesa Code: ${data.mpesaCode}`, margin, y, { fontSize: 7 });
    y += 3;
  }
  if (data.cashReceived) {
    addText(`Cash Received: Ksh ${data.cashReceived.toLocaleString()}`, margin, y, { fontSize: 7 });
    y += 3;
  }
  if (data.changeGiven) {
    addText(`Change: Ksh ${data.changeGiven.toLocaleString()}`, margin, y, { fontSize: 7 });
    y += 3;
  }
  addText(`Delivery: ${data.deliveryType}`, margin, y, { fontSize: 7 });
  y += 3;
  if (data.deliveryAddress) {
    addText(`Address: ${data.deliveryAddress}`, margin, y, { fontSize: 6, maxWidth: contentWidth });
    y += 5;
  }

  addDashedLine(y); y += 4;

  // Footer
  addText('Thank you for shopping with', 0, y, { fontSize: 7, align: 'center' });
  y += 3;
  addText('Chopa Cosmetics!', 0, y, { fontSize: 7, fontStyle: 'bold', align: 'center' });
  y += 3;
  addText('www.chopacosmetics.lovable.app', 0, y, { fontSize: 6, align: 'center' });

  // Trim page height
  const finalHeight = y + 8;
  // jsPDF doesn't support resizing after creation, but 200mm is plenty for receipts

  const filename = `receipt-${data.receiptNumber || data.orderId.slice(0, 8)}.pdf`;
  doc.save(filename);
}
