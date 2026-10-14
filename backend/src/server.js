import 'dotenv/config';
import http from 'node:http';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { attachSocketServer } from './socket.js';
import { startAuctionLifecycle } from './services/auctionLifecycle.js';

const port = Number(process.env.PORT || 5000);
const server = http.createServer(app);

attachSocketServer(server);

try {
  await connectDatabase();

  // Automatically start and close auctions.
  startAuctionLifecycle();

  server.listen(port, () => {
    console.log(JSON.stringify({
      level: 'info',
      event: 'server_started',
      port,
      env: process.env.NODE_ENV || 'development'
    }));
  });
} catch (error) {
  console.error(JSON.stringify({
    level: 'error',
    event: 'startup_failed',
    message: error.message
  }));

  process.exit(1);
}