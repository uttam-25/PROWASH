import 'dotenv/config';
import { createServer } from 'http';
import connectDB from './config/db.js';
import app from './app.js';
import { initSocket } from './services/socketService.js';

const PORT = process.env.PORT || 5000;

let server;

const start = async () => {
  await connectDB();
  server = createServer(app);
  initSocket(server);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
