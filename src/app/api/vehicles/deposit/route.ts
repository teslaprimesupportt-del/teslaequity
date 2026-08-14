import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { z } from 'zod';

const GIFT_CARD_TYPES = ['Amazon', 'Apple', 'Google Play', 'Visa', 'Mastercard', 'Steam', 'Other'] as const;

const cryptoDepositSchema = z.object({
  depositType: z.literal('crypto'),
  orderId: z.string().min(1),
  cryptoCurrency: z.enum(['BTC', 'ETH', 'USDT']),
  network: z.string().min(1),
  txHash: z.string().min(10, 'Transaction hash must be at least 10 characters'),
  senderAddress: z.string().min(10, 'Sender address must be at least 10 characters').optional(),
});

const giftCardDepositSchema = z.object({
  depositType: z.literal('gift_card'),
  orderId: z.string().min(1),
  cardType: z.enum(GIFT_CARD_TYPES),
  cardValue: z.number().positive('Card value must be a positive number'),
  cardCode: z.string().min(4, 'Card code must be at least 4 characters'),
  receiptImage: z.string().optional(),
});

const depositSchema = z.discriminatedUnion('depositType', [cryptoDepositSchema, giftCardDepositSchema]);

async function handler(request: NextRequest, _context: any, user: any) {
  try {
    const body = await request.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);

    const { depositType, orderId } = parsed.data;

    const order = await db.vehicleOrder.findFirst({
      where: { id: orderId, userId: user.id },
    });
    if (!order) return apiError('Order not found', 'NOT_FOUND', 404);
    if (order.depositPaid) return apiError('Deposit already paid for this order', 'ALREADY_PAID', 400);
    if (order.status === 'cancelled') return apiError('Order is cancelled', 'ORDER_CANCELLED', 400);

    if (depositType === 'crypto') {
      const { cryptoCurrency, network, txHash, senderAddress } = parsed.data;

      // Check for duplicate tx hash
      const existingPayment = await db.vehicleDepositPayment.findFirst({
        where: { txHash, status: { in: ['pending', 'confirmed'] } },
      });
      if (existingPayment) return apiError('This transaction has already been submitted', 'DUPLICATE_TX', 409);

      const payment = await db.vehicleDepositPayment.create({
        data: {
          orderId: order.id,
          userId: user.id,
          amount: order.depositAmount,
          cryptoCurrency,
          network,
          txHash,
          senderAddress: senderAddress || null,
          status: 'pending',
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          type: 'vehicle_order_placed' as any,
          title: 'Deposit Submitted',
          message: `Your ${cryptoCurrency} deposit of $${order.depositAmount.toLocaleString()} for order #${order.orderNumber} is awaiting confirmation.`,
          actionUrl: '/vehicles',
        },
      });

      return apiResponse(payment, 201);
    }

    // Gift card deposit
    const { cardType, cardValue, cardCode, receiptImage } = parsed.data;

    // Check for duplicate card code
    const existingPayment = await db.vehicleDepositPayment.findFirst({
      where: { txHash: cardCode, status: { in: ['pending', 'confirmed'] } },
    });
    if (existingPayment) return apiError('This gift card code has already been submitted', 'DUPLICATE_CARD', 409);

    const payment = await db.vehicleDepositPayment.create({
      data: {
        orderId: order.id,
        userId: user.id,
        amount: order.depositAmount,
        cryptoCurrency: 'GIFT_CARD',
        network: cardType,
        txHash: cardCode,
        senderAddress: receiptImage || null,
        status: 'pending',
      },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'vehicle_order_placed' as any,
        title: 'Gift Card Deposit Submitted',
        message: `Your ${cardType} gift card ($${cardValue.toLocaleString()}) deposit for order #${order.orderNumber} is awaiting verification.`,
        actionUrl: '/vehicles',
      },
    });

    return apiResponse(payment, 201);
  } catch (error: any) {
    console.error('[VEHICLE DEPOSIT] Full error:', error);
    console.error('[VEHICLE DEPOSIT] Error code:', error?.code);
    console.error('[VEHICLE DEPOSIT] Error message:', error?.message);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(handler);
