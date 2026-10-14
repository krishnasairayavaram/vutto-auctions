import { Server } from 'socket.io';

let io;
export function attachSocketServer(server) {
  const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(x => x.trim());
  io = new Server(server, { cors: { origin: origins } });
  io.on('connection', (socket) => {
    socket.on('auction:join', (auctionId) => {
      if (typeof auctionId === 'string' && /^[a-f\d]{24}$/i.test(auctionId)) socket.join(`auction:${auctionId}`);
    });
    socket.on('auction:leave', (auctionId) => {
      if (typeof auctionId === 'string' && /^[a-f\d]{24}$/i.test(auctionId)) socket.leave(`auction:${auctionId}`);
    });
  });
  return io;
}
export function getIO() { return io; }
