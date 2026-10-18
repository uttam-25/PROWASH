// Standalone seed script
// Run with: node scripts/seedServices.js  (from the server/ directory)
import 'dotenv/config';
import { pathToFileURL } from 'url';
import connectDB from '../src/config/db.js';
import Service from '../src/models/Service.js';
import Schedule from '../src/models/Schedule.js';

export const defaultServices = [
  {
    name: 'Car Exterior Wash',
    description: 'Full exterior wash for cars including rinse, soap, and dry.',
    category: 'exterior',
    vehicleTypes: ['Car', 'SUV'],
    price: 299,
    duration: 30,
    isActive: true,
  },
  {
    name: 'Car Interior Clean',
    description: 'Interior vacuuming, dashboard wipe, and window clean.',
    category: 'interior',
    vehicleTypes: ['Car', 'SUV'],
    price: 399,
    duration: 45,
    isActive: true,
  },
  {
    name: 'Car Full Wash',
    description: 'Complete exterior + interior cleaning package for cars.',
    category: 'full',
    vehicleTypes: ['Car', 'SUV'],
    price: 599,
    duration: 60,
    isActive: true,
  },
  {
    name: 'Car Premium Detailing',
    description: 'Premium detailing with polish, wax, and deep interior clean.',
    category: 'premium',
    vehicleTypes: ['Car', 'SUV'],
    price: 1299,
    duration: 120,
    isActive: true,
  },
  {
    name: 'Bike Exterior Wash',
    description: 'Full exterior wash for bikes and scooties.',
    category: 'exterior',
    vehicleTypes: ['Bike', 'Scooty'],
    price: 149,
    duration: 20,
    isActive: true,
  },
  {
    name: 'Bike Full Wash',
    description: 'Complete wash and chain lube for bikes and scooties.',
    category: 'full',
    vehicleTypes: ['Bike', 'Scooty'],
    price: 249,
    duration: 30,
    isActive: true,
  },
];

/**
 * Seed schedule and services into the database.
 * Can be called programmatically (e.g. from the dev seed API route).
 * Does NOT call process.exit — safe to use inside a running server.
 */
export async function seedServicesData() {
  // Seed Schedule
  const existingSchedule = await Schedule.findOne({ isActive: true });
  if (!existingSchedule) {
    await new Schedule({ isActive: true }).save();
  }

  // Seed Services
  const count = await Service.countDocuments();
  if (count > 0) {
    return { skipped: true, existing: count };
  }

  await Service.insertMany(defaultServices);
  return { seeded: true, count: defaultServices.length };
}

// Standalone runner — only executes when this file is run directly
const seed = async () => {
  await connectDB();

  const result = await seedServicesData();

  if (result.skipped) {
    console.log(`Services already exist (${result.existing} found) — skipping.`);
  } else {
    console.log(`Services seeded: ${result.count} services created.`);
  }

  process.exit(0);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
