import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers';

// GET - List all vehicle deposit payments (admin only)
async function listHandler(request: NextRequest, _context: any, user: any) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status) where.status = status;

    const payments = await db.vehicleDepositPayment.findMany({
      where,
      include: {
        order: { include: { vehicle: true } },
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiResponse(payments);
  } catch (error: any) {
    console.error('List vehicle deposits error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

// POST - Confirm or reject a deposit payment (admin only)
async function actionHandler(request: NextRequest, _context: any, user: any) {
  try {
    const body = await request.json();
    const { paymentId, action } = body;

    if (!paymentId || !['confirm', 'reject'].includes(action)) {
      return apiError('paymentId and action (confirm/reject) required', 'VALIDATION_ERROR', 400);
    }

    const payment = await db.vehicleDepositPayment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) return apiError('Payment not found', 'NOT_FOUND', 404);
    if (payment.status !== 'pending') return apiError('Payment already processed', 'ALREADY_PROCESSED', 400);

    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';

    const updated = await db.vehicleDepositPayment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        confirmedBy: user.id,
        confirmedAt: action === 'confirm' ? new Date() : null,
      },
    });

    if (action === 'confirm') {
      await db.vehicleOrder.update({
        where: { id: payment.orderId },
        data: { depositPaid: true },
      });

      await db.notification.create({
        data: {
          userId: payment.userId,
          type: 'vehicle_order_confirmed' as any,
          title: 'Deposit Confirmed',
          message: `Your deposit of $${payment.amount.toLocaleString()} for order #${payment.order.orderNumber} has been confirmed.`,
          actionUrl: '/tracking',
        },
      });
    }

    return apiResponse(updated);
  } catch (error: any) {
    console.error('Vehicle deposit action error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireRole('ADMIN', 'SUPER_ADMIN')(listHandler);
export const POST = requireRole('ADMIN', 'SUPER_ADMIN')(actionHandler);
