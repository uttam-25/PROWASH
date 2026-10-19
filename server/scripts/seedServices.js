// Standalone seed script
// Run with: node scripts/seedServices.js  (from the server/ directory)
import 'dotenv/config';
import { pathToFileURL } from 'url';
import connectDB from '../src/config/db.js';
import Service from '../src/models/Service.js';
import Schedule from '../src/models/Schedule.js';

export const defaultServices = [
  // Cars - exterior
  { name: 'Basic Exterior Wash', description: 'Full exterior wash including rinse, soap, foam and dry.', category: 'exterior', vehicleTypes: ['Car'], price: 199, duration: 30, isActive: true },
  { name: 'Foam Wash', description: 'High-quality foam wash for a deep exterior clean.', category: 'exterior', vehicleTypes: ['Car'], price: 249, duration: 35, isActive: true },
  // Cars - interior
  { name: 'Interior Vacuum', description: 'Thorough interior vacuuming and floor-mat cleaning.', category: 'interior', vehicleTypes: ['Car'], price: 249, duration: 30, isActive: true },
  { name: 'Dashboard & Door Panel Clean', description: 'Dashboard wipe, door-panel and console cleaning.', category: 'interior', vehicleTypes: ['Car'], price: 199, duration: 25, isActive: true },
  { name: 'Full Interior Clean', description: 'Complete interior clean: vacuum, seats, windows, dashboard.', category: 'interior', vehicleTypes: ['Car'], price: 499, duration: 60, isActive: true },
  // Cars - full
  { name: 'Interior + Exterior Wash', description: 'Full interior and exterior wash package.', category: 'full', vehicleTypes: ['Car'], price: 499, duration: 75, isActive: true },
  // Cars - premium
  { name: 'Premium Detailing', description: 'Professional detailing: polish, wax, deep interior clean.', category: 'premium', vehicleTypes: ['Car'], price: 1499, duration: 180, isActive: true },
  { name: 'Waxing & Polishing', description: 'Hand wax and machine polish for a showroom finish.', category: 'premium', vehicleTypes: ['Car'], price: 999, duration: 90, isActive: true },
  { name: 'Deep Interior Clean', description: 'Deep clean: upholstery, carpets, odour treatment.', category: 'interior', vehicleTypes: ['Car'], price: 799, duration: 120, isActive: true },
  // Bikes
  { name: 'Bike Basic Wash', description: 'Full exterior wash for bikes.', category: 'exterior', vehicleTypes: ['Bike'], price: 99, duration: 20, isActive: true },
  { name: 'Bike Foam Wash', description: 'Foam wash for a sparkling clean bike.', category: 'exterior', vehicleTypes: ['Bike'], price: 149, duration: 25, isActive: true },
  { name: 'Bike Full Clean', description: 'Complete wash with chain clean and lube.', category: 'full', vehicleTypes: ['Bike'], price: 199, duration: 40, isActive: true },
  { name: 'Bike Premium Detail', description: 'Chrome polish, deep clean, premium bike detailing.', category: 'premium', vehicleTypes: ['Bike'], price: 499, duration: 90, isActive: true },
  // Scooties
  { name: 'Scooty Basic Wash', description: 'Full exterior wash for scooties.', category: 'exterior', vehicleTypes: ['Scooty'], price: 79, duration: 15, isActive: true },
  { name: 'Scooty Foam Wash', description: 'Foam wash for a spotless scooty.', category: 'exterior', vehicleTypes: ['Scooty'], price: 129, duration: 20, isActive: true },
  { name: 'Scooty Full Clean', description: 'Complete scooty cleaning: panels, wheels, mirrors.', category: 'full', vehicleTypes: ['Scooty'], price: 149, duration: 35, isActive: true },
  { name: 'Scooty Premium Detail', description: 'Premium scooty detailing and panel polish.', category: 'premium', vehicleTypes: ['Scooty'], price: 299, duration: 60, isActive: true },
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

  // Clear and reseed services
  await Service.deleteMany({});
  await Service.insertMany(defaultServices);
  return { seeded: true, count: defaultServices.length };
}

// Standalone runner — only executes when this file is run directly
const seed = async () => {
  await connectDB();

  const result = await seedServicesData();
  console.log(`Services seeded: ${result.count} services created.`);

  process.exit(0);
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
