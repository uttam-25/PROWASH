import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

// CORS — allow all origins (restrict in production via env)
app.use(cors({ origin: '*' }));

// HTTP request logger (dev only)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Vehicle routes
app.use('/api/vehicles', vehicleRoutes);

// Service routes
app.use('/api/services', serviceRoutes);

// Availability routes
app.use('/api/availability', availabilityRoutes);

// Booking routes
app.use('/api/bookings', bookingRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Admin routes (reports, schedule, admin-scoped resources)
app.use('/api/admin', adminRoutes);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralised error handler (must be last)
app.use(errorHandler);

export default app;
