import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { sendVehicleOrderReceipt } from '@/lib/email';
import { z } from 'zod';

const orderSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  selectedColor: z.enum(['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red', 'quick_silver', 'blue_multi_coat']).default('pearl_white'),
  selectedInterior: z.string().default('Premium Black'),
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().default('US'),
  notes: z.string().optional(),
  addons: z.array(z.string()).optional(),
  addonsTotal: z.number().optional(),
});

// Fallback vehicles used when DB table is empty
const DEFAULT_VEHICLES: Record<string, any> = {
  'default-1': { id: 'default-1', name: 'Model S', slug: 'model-s', category: 'Sedan', basePrice: 89990, imageUrl: '/images/model-s.jpg', description: 'The Model S sets the benchmark for luxury electric sedans.', specs: { range: 405, acceleration: '1.99s', topSpeed: '200 mph', horsepower: 670, cargo: '28 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q4 2026', featured: true, sortOrder: 0, active: true },
  'default-2': { id: 'default-2', name: 'Model 3', slug: 'model-3', category: 'Sedan', basePrice: 38990, imageUrl: '/images/model-3.jpg', description: 'The Model 3 is the most affordable Tesla.', specs: { range: 358, acceleration: '5.8s', topSpeed: '140 mph', horsepower: 283, cargo: '23 cu ft', drivetrain: 'Rear-Wheel Drive' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q3 2026', featured: false, sortOrder: 1, active: true },
  'default-3': { id: 'default-3', name: 'Model X', slug: 'model-x', category: 'SUV', basePrice: 94990, imageUrl: '/images/model-x.jpg', description: "Tesla's flagship SUV with falcon-wing doors.", specs: { range: 348, acceleration: '3.8s', topSpeed: '155 mph', horsepower: 670, cargo: '91 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red'], interior: 'Premium Black', estimatedDelivery: 'Q1 2027', featured: true, sortOrder: 2, active: true },
  'default-4': { id: 'default-4', name: 'Model Y', slug: 'model-y', category: 'SUV', basePrice: 44990, imageUrl: '/images/model-y.jpg', description: 'Compact SUV built on the Model 3 platform.', specs: { range: 310, acceleration: '4.8s', topSpeed: '135 mph', horsepower: 384, cargo: '76 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q3 2026', featured: false, sortOrder: 3, active: true },
  'default-5': { id: 'default-5', name: 'Cybertruck', slug: 'cybertruck', category: 'Pickup', basePrice: 79990, imageUrl: '/images/cybertruck.jpg', description: 'All-electric pickup with stainless-steel exoskeleton.', specs: { range: 340, acceleration: '2.6s', topSpeed: '130 mph', horsepower: 845, cargo: '100 cu ft', drivetrain: 'Tri Motor AWD' }, colors: ['solid_black'], interior: 'Premium Black', estimatedDelivery: 'Q2 2027', featured: true, sortOrder: 4, active: true },
  'default-6': { id: 'default-6', name: 'Model S Plaid', slug: 'model-s-plaid', category: 'Sedan', basePrice: 109990, imageUrl: '/images/model-s.webp', description: 'The ultimate performance sedan with tri-motor power.', specs: { range: 396, acceleration: '1.99s', topSpeed: '200 mph', horsepower: 1020, cargo: '28 cu ft', drivetrain: 'Tri Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red', 'quick_silver', 'blue_multi_coat'], interior: 'Premium Black', estimatedDelivery: 'Q4 2026', featured: true, sortOrder: 5, active: true },
};

async function handler(request: NextRequest, _context: any, user: any) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, 'VALIDATION_ERROR', 400);
    }

    const data = parsed.data;

    // Try to find vehicle in DB first
    let vehicle = await db.teslaVehicle.findUnique({ where: { id: data.vehicleId } }).catch(() => null);

    // If not in DB, check if it's a fallback default vehicle and auto-create it
    if (!vehicle && DEFAULT_VEHICLES[data.vehicleId]) {
      try {
        const def = DEFAULT_VEHICLES[data.vehicleId];
        vehicle = await db.teslaVehicle.create({
          data: {
            name: def.name,
            slug: def.slug,
            category: def.category,
            basePrice: def.basePrice,
            imageUrl: def.imageUrl,
            description: def.description,
            specs: def.specs,
            colors: def.colors,
            interior: def.interior,
            estimatedDelivery: def.estimatedDelivery,
            featured: def.featured,
            sortOrder: def.sortOrder,
            active: true,
          },
        });
        console.log(`[VEHICLE ORDER] Auto-created vehicle in DB: ${def.name} (${vehicle.id})`);
      } catch (createErr: any) {
        // If slug conflict, try to find by slug
        if (createErr.code === 'P2002') {
          vehicle = await db.teslaVehicle.findFirst({ where: { slug: DEFAULT_VEHICLES[data.vehicleId].slug } });
        }
        if (!vehicle) {
          console.error('[VEHICLE ORDER] Failed to create/find fallback vehicle:', createErr);
          return apiError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404);
        }
      }
    }

    if (!vehicle) {
      return apiError('Vehicle not found', 'VEHICLE_NOT_FOUND', 404);
    }
    if (!vehicle.active) {
      return apiError('This vehicle is no longer available', 'VEHICLE_INACTIVE', 400);
    }

    // Check if user already has an active (non-cancelled) order for this vehicle
    const existingOrder = await db.vehicleOrder.findFirst({
      where: { userId: user.id, vehicleId: vehicle.id, status: { notIn: ['cancelled', 'delivered'] } },
    }).catch(() => null);
    if (existingOrder) {
      return apiError('You already have an active order for this vehicle', 'DUPLICATE_ORDER', 409);
    }

    const addonsTotal = data.addonsTotal || 0;
    const totalPrice = vehicle.basePrice + addonsTotal;
    const depositAmount = Number((totalPrice * 0.1).toFixed(2));
    const orderNumber = `TP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const order = await db.vehicleOrder.create({
      data: {
        userId: user.id,
        vehicleId: vehicle.id,
        selectedColor: data.selectedColor,
        selectedInterior: data.selectedInterior,
        totalPrice,
        depositAmount,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        orderNumber,
        notes: data.notes || null,
        trackingInfo: data.addons && data.addons.length > 0 ? { addons: data.addons, addonsTotal } : undefined,
      },
      include: { vehicle: true },
    });

    // Notification for the buyer
    await db.notification.create({
      data: {
        userId: user.id,
        type: 'vehicle_order_placed' as any,
        title: 'Vehicle Order Placed',
        message: `Your order for ${vehicle.name} has been placed. Order #${orderNumber}. Deposit required: $${depositAmount.toLocaleString()}.`,
        actionUrl: '/vehicles',
      },
    }).catch((err: any) => console.error('[VEHICLE ORDER] Notification create failed:', err?.message));

    // Send purchase receipt / invoice email (non-blocking)
    sendVehicleOrderReceipt(data.email, {
      orderNumber,
      vehicleName: vehicle.name,
      selectedColor: data.selectedColor,
      selectedInterior: data.selectedInterior,
      totalPrice,
      depositAmount,
      estimatedDelivery: vehicle.estimatedDelivery,
      fullName: data.fullName,
      address: data.address,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
    }).catch((err: any) => console.error('[VEHICLE ORDER] Failed to send receipt email:', err?.message || err));

    // Referral commission: if user was referred, give referrer 5% of deposit
    if (user.referredById) {
      try {
        const commissionAmount = Number((depositAmount * 0.05).toFixed(2));
        await db.referralCommission.create({
          data: {
            userId: user.referredById,
            referrerId: user.referredById,
            amount: commissionAmount,
            rate: 0.05,
            level: 1,
            type: 'direct',
            status: 'pending',
          },
        });
        await db.notification.create({
          data: {
            userId: user.referredById,
            type: 'referral_earned',
            title: 'Referral Bonus Earned',
            message: `You earned a $${commissionAmount} referral bonus from a vehicle order.`,
          },
        });
      } catch (refErr) {
        console.error('Vehicle referral commission error:', refErr);
      }
    }

    return apiResponse(order, 201);
  } catch (error: any) {
    console.error('[VEHICLE ORDER] Full error:', error);
    console.error('[VEHICLE ORDER] Error code:', error?.code);
    console.error('[VEHICLE ORDER] Error message:', error?.message);
    if (error?.code === 'P2002') {
      return apiError('Duplicate order detected. Please check your orders.', 'DUPLICATE', 409);
    }
    if (error?.code === 'P2025') {
      return apiError('Related record not found (vehicle or user). Please try again.', 'NOT_FOUND', 404);
    }
    if (error?.message?.includes('Unknown field') || error?.message?.includes('Column')) {
      console.error('[VEHICLE ORDER] Possible schema mismatch — run prisma db push');
      return apiError('Service configuration error. Please contact support.', 'SCHEMA_ERROR', 500);
    }
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(handler);
