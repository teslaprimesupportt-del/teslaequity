import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiResponse, apiError } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (!slug) return apiError('Slug is required', 'MISSING_SLUG', 400);

    // Try DB first
    try {
      const vehicle = await db.teslaVehicle.findUnique({ where: { slug } });
      if (vehicle) return apiResponse(vehicle);
    } catch (dbErr: any) {
      console.warn('[Vehicle Slug] DB query failed:', dbErr.message);
    }

    // Fallback to hardcoded defaults
    const defaults: any[] = [
      { id: 'default-1', slug: 'model-s', name: 'Model S', category: 'Sedan', basePrice: 89990, imageUrl: '/images/model-s.jpg', description: 'The Model S sets the benchmark for luxury electric sedans with unparalleled range, acceleration, and technology.', specs: { range: 405, acceleration: '1.99s', topSpeed: '200 mph', horsepower: 670, cargo: '28 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q4 2026', featured: true, sortOrder: 0, active: true },
      { id: 'default-2', slug: 'model-3', name: 'Model 3', category: 'Sedan', basePrice: 38990, imageUrl: '/images/model-3.jpg', description: 'The Model 3 is the most affordable Tesla, designed for mass-market appeal with impressive range and technology.', specs: { range: 358, acceleration: '5.8s', topSpeed: '140 mph', horsepower: 283, cargo: '23 cu ft', drivetrain: 'Rear-Wheel Drive' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q3 2026', featured: false, sortOrder: 1, active: true },
      { id: 'default-3', slug: 'model-x', name: 'Model X', category: 'SUV', basePrice: 94990, imageUrl: '/images/model-x.jpg', description: "The Model X is Tesla's flagship SUV with falcon-wing doors, exceptional cargo space, and unmatched performance.", specs: { range: 348, acceleration: '3.8s', topSpeed: '155 mph', horsepower: 670, cargo: '91 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red'], interior: 'Premium Black', estimatedDelivery: 'Q1 2027', featured: true, sortOrder: 2, active: true },
      { id: 'default-4', slug: 'model-y', name: 'Model Y', category: 'SUV', basePrice: 44990, imageUrl: '/images/model-y.jpg', description: 'The Model Y is a compact SUV built on the Model 3 platform, offering versatility, space, and Tesla performance.', specs: { range: 310, acceleration: '4.8s', topSpeed: '135 mph', horsepower: 384, cargo: '76 cu ft', drivetrain: 'Dual Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'quick_silver'], interior: 'Premium Black', estimatedDelivery: 'Q3 2026', featured: false, sortOrder: 3, active: true },
      { id: 'default-5', slug: 'cybertruck', name: 'Cybertruck', category: 'Pickup', basePrice: 79990, imageUrl: '/images/cybertruck.jpg', description: 'The Cybertruck is an all-electric pickup with a radical stainless-steel exoskeleton and exceptional utility.', specs: { range: 340, acceleration: '2.6s', topSpeed: '130 mph', horsepower: 845, cargo: '100 cu ft', drivetrain: 'Tri Motor AWD' }, colors: ['solid_black'], interior: 'Premium Black', estimatedDelivery: 'Q2 2027', featured: true, sortOrder: 4, active: true },
      { id: 'default-6', slug: 'model-s-plaid', name: 'Model S Plaid', category: 'Sedan', basePrice: 109990, imageUrl: '/images/model-s.webp', description: 'The Model S Plaid is the ultimate performance sedan with tri-motor power, track-level capability, and the fastest acceleration of any production car.', specs: { range: 396, acceleration: '1.99s', topSpeed: '200 mph', horsepower: 1020, cargo: '28 cu ft', drivetrain: 'Tri Motor AWD' }, colors: ['pearl_white', 'solid_black', 'midnight_silver', 'deep_blue', 'red_multi_coat', 'ultra_red', 'quick_silver', 'blue_multi_coat'], interior: 'Premium Black', estimatedDelivery: 'Q4 2026', featured: true, sortOrder: 5, active: true },
    ];
    const vehicle = defaults.find(v => v.slug === slug);
    if (!vehicle) return apiError('Vehicle not found', 'NOT_FOUND', 404);
    return apiResponse(vehicle);
  } catch (error: any) {
    console.error('Get vehicle by slug error:', error);
    return apiError('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
