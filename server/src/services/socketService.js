import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Booking from '../models/Booking.js';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Connection-level JWT guard — rejects unauthenticated sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role; // role is included if stored in token payload
      next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a booking room — only the booking's customer or assigned partner may join
    socket.on('join:booking', async ({ bookingId }) => {
      if (!bookingId) return;
      try {
        const booking = await Booking.findById(bookingId).select('customerId partnerId');
        if (!booking) return;
        const uid = socket.userId?.toString();
        const isCustomer = booking.customerId?.toString() === uid;
        const isPartner = booking.partnerId?.toString() === uid;
        if (isCustomer || isPartner) {
          socket.join(`booking:${bookingId}`);
        }
      } catch {}
    });

    socket.on('join:partner', ({ partnerId }) => {
      // Only the partner themselves may join their own room
      if (partnerId && socket.userId?.toString() === partnerId.toString()) {
        socket.join(`partner:${partnerId}`);
      }
    });

    socket.on('join:partners', () => {
      socket.join('partners');
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToBooking(bookingId, event, data) {
  if (io) io.to(`booking:${bookingId}`).emit(event, data);
}

export function emitToPartner(partnerId, event, data) {
  if (io) io.to(`partner:${partnerId}`).emit(event, data);
}

export function emitToAll(room, event, data) {
  if (io) io.to(room).emit(event, data);
}
