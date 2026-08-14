import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

const COLOR_HEX_MAP: Record<string, string> = {
  pearl_white: '#F5F5F5', solid_black: '#1A1A1A', midnight_silver: '#6E7681',
  deep_blue: '#1E3A5F', red_multi_coat: '#CC0000', ultra_red: '#B71C1C',
  quick_silver: '#9CA3AF', blue_multi_coat: '#3B82F6',
};
const COLOR_NAME_MAP: Record<string, string> = {
  pearl_white: 'Pearl White', solid_black: 'Solid Black', midnight_silver: 'Midnight Silver',
  deep_blue: 'Deep Blue', red_multi_coat: 'Red Multi-Coat', ultra_red: 'Ultra Red',
  quick_silver: 'Quick Silver', blue_multi_coat: 'Blue Multi-Coat',
};

async function handler(request: NextRequest, _context: any, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) return apiError('Order ID required', 'MISSING_ORDER_ID', 400);

    const order = await db.vehicleOrder.findFirst({
      where: { id: orderId, userId: user.id },
      include: { vehicle: true },
    });
    if (!order) return apiError('Order not found', 'NOT_FOUND', 404);

    const colorName = COLOR_NAME_MAP[order.selectedColor] || order.selectedColor;
    const colorHex = COLOR_HEX_MAP[order.selectedColor] || '#888';
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const remaining = order.totalPrice - order.depositAmount;

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice #${order.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
  .invoice { max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .logo { font-size: 24px; font-weight: 700; color: #CC0000; letter-spacing: 1px; }
  .badge { display: inline-block; color: #22C55E; font-size: 9px; font-weight: 700; letter-spacing: 3px; padding: 6px 16px; border: 1px solid #22C55E; border-radius: 3px; text-transform: uppercase; margin-top: 8px; }
  .meta { background: #111; border: 1px solid #222; border-radius: 8px; padding: 20px 24px; margin-bottom: 20px; }
  .meta-row { display: flex; justify-content: space-between; padding: 8px 0; }
  .meta-label { color: #666; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; }
  .meta-value { color: #fff; font-weight: 600; }
  .section { background: #111; border: 1px solid #222; border-radius: 8px; padding: 24px; margin-bottom: 20px; }
  .section-title { color: #CC0000; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1a; }
  .row:last-child { border-bottom: none; }
  .row-label { color: #888; font-size: 13px; }
  .row-value { color: #fff; font-size: 13px; font-weight: 600; }
  .row-value.deposit { color: #CC0000; font-size: 14px; font-weight: 700; }
  .color-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); vertical-align: middle; margin-right: 6px; }
  .address-section { border-left: 3px solid #3B82F6; }
  .footer { text-align: center; color: #444; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #1a1a1a; }
</style>
</head><body>
<div class="invoice">
  <div class="header">
    <div>
      <div class="logo">TESLAPRIME</div>
      <div class="badge">Order Confirmed</div>
    </div>
    <div style="text-align:right">
      <div class="meta-label">Invoice</div>
      <div class="meta-value" style="font-family:monospace;letter-spacing:1px">#${order.orderNumber}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-row">
      <div><div class="meta-label">Order Date</div><div class="meta-value">${orderDate}</div></div>
      <div style="text-align:right"><div class="meta-label">Payment Status</div><div class="meta-value" style="color:${order.depositPaid ? '#22C55E' : '#F59E0B'}">${order.depositPaid ? 'Deposit Paid' : 'Deposit Pending'}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Vehicle Details</div>
    <div class="row"><span class="row-label">Vehicle</span><span class="row-value">${order.vehicle.name}</span></div>
    <div class="row"><span class="row-label">Exterior Color</span><span class="row-value"><span class="color-swatch" style="background:${colorHex}"></span>${colorName}</span></div>
    <div class="row"><span class="row-label">Interior</span><span class="row-value">${order.selectedInterior}</span></div>
    <div class="row"><span class="row-label">Est. Delivery</span><span class="row-value">${order.vehicle.estimatedDelivery}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Pricing</div>
    <div class="row"><span class="row-label">Vehicle Total</span><span class="row-value">$${order.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span class="row-label">Required Deposit (10%)</span><span class="row-value deposit">$${order.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
    <div class="row"><span class="row-label">Remaining Balance</span><span class="row-value">$${remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
  </div>

  <div class="section address-section">
    <div class="section-title" style="color:#3B82F6">Delivery Address</div>
    <div style="color:#fff;font-weight:500">${order.fullName}</div>
    <div style="color:#ccc;margin-top:4px;line-height:1.8">${order.address}<br/>${order.city}, ${order.state} ${order.postalCode}<br/>${order.country}</div>
  </div>

  <div class="footer">
    TeslaPrime &mdash; Premium Tesla Vehicle Sales<br/>
    This invoice was generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</div>
</body></html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${order.orderNumber}.html"`,
      },
    });
  } catch (error: any) {
    console.error('Invoice error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireAuth(handler);
