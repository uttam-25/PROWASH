// Standalone seed script — not imported by app.js
// Run with: node scripts/seedAdmin.js  (from the server/ directory)
import 'dotenv/config';
import connectDB from '../src/config/db.js';
import User from '../src/models/User.js';

const seed = async () => {
  await connectDB();

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    process.exit(0);
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  await User.create({
    name: ADMIN_NAME || 'ProWash Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });

  console.log('Admin seeded successfully:', ADMIN_EMAIL);
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
