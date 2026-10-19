import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    socket.on('join:booking', ({ bookingId }) => {
      if (bookingId) socket.join(`booking:${bookingId}`);
    });
    socket.on('join:partner', ({ partnerId }) => {
      if (partnerId) socket.join(`partner:${partnerId}`);
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
