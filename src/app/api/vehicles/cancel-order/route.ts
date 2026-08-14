import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

async function handler(request: NextRequest, _context: any, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) return apiError('Order ID is required', 'MISSING_ORDER_ID', 400);

    const order = await db.vehicleOrder.findFirst({
      where: { id: orderId, userId: user.id },
    });
    if (!order) return apiError('Order not found', 'NOT_FOUND', 404);

    // Only pending orders can be cancelled by user
    if (order.status !== 'pending') {
      return apiError('Only pending orders can be cancelled', 'CANNOT_CANCEL', 400);
    }
    if (order.depositPaid) {
      return apiError('Cannot cancel order with paid deposit. Contact support.', 'DEPOSIT_PAID', 400);
    }

    const updated = await db.vehicleOrder.update({
      where: { id: order.id },
      data: {
        status: 'cancelled',
        trackingInfo: {
          ...(order.trackingInfo as any || {}),
          timeline: [
            { status: 'cancelled', timestamp: new Date().toISOString(), note: 'Order cancelled by customer' },
            ...((order.trackingInfo as any)?.timeline || []),
          ],
        },
      },
    });

    // Notification
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'vehicle_order_cancelled' as any,
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} for has been cancelled.`,
        actionUrl: '/vehicles',
      },
    });

    return apiResponse(updated);
  } catch (error: any) {
    console.error('Cancel order error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(handler);
