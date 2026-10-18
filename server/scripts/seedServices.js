// Standalone seed script
// Run with: node scripts/seedServices.js  (from the server/ directory)
import 'dotenv/config';
import connectDB from '../src/config/db.js';
import Service from '../src/models/Service.js';
import Schedule from '../src/models/Schedule.js';

const defaultServices = [
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

const seed = async () => {
  await connectDB();

  // Seed Schedule
  const existingSchedule = await Schedule.findOne({ isActive: true });
  if (existingSchedule) {
    console.log('Schedule already exists — skipping.');
  } else {
    await new Schedule({ isActive: true }).save();
    console.log('Schedule seeded with defaults.');
  }

  // Seed Services
  const count = await Service.countDocuments();
  if (count > 0) {
    console.log(`Services already exist (${count} found) — skipping.`);
    process.exit(0);
  }

  await Service.insertMany(defaultServices);
  console.log(`Services seeded: ${defaultServices.length} services created.`);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
