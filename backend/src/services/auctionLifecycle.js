import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { getIO } from '../socket.js';

function notifyAuctionUpdate(auction, eventType) {
  const io = getIO();

  if (!io) return;

  const payload = {
    auctionId: auction._id.toString(),
    status: auction.status,
    currentBid: auction.currentBid,
    currentBidder: auction.currentBidder
      ? auction.currentBidder.toString()
      : null,
    winner: auction.winner
      ? auction.winner.toString()
      : null,
    winningBid: auction.winningBid ?? null
  };

  // Notify users viewing this particular auction.
  io.to(`auction:${auction._id}`).emit(
    'auction:status',
    { ...payload, eventType }
  );

  // Notify connected clients that auction data changed.
  io.emit('auction:updated', { ...payload, eventType });
}

export async function processAuctionLifecycle() {
  const now = new Date();

  // 1. Start auctions whose start time has arrived,
  // provided their end time is still in the future.
  const startingAuctions = await Auction.find({
    status: 'scheduled',
    startsAt: { $lte: now },
    endsAt: { $gt: now }
  }).select('_id');

  for (const item of startingAuctions) {
    const auction = await Auction.findOneAndUpdate(
      {
        _id: item._id,
        status: 'scheduled',
        startsAt: { $lte: now },
        endsAt: { $gt: now }
      },
      { $set: { status: 'live' } },
      { new: true }
    );

    // Only the process that changes the status sends an event.
    if (auction) {
      notifyAuctionUpdate(auction, 'started');
    }
  }

  // 2. Close expired scheduled or live auctions.
  // This also handles auctions that were missed while the server
  // was offline and have already passed both dates.
  const expiredAuctions = await Auction.find({
    status: { $in: ['scheduled', 'live'] },
    endsAt: { $lte: now }
  }).select('_id');

  for (const item of expiredAuctions) {
    // Find the highest saved bid. If there are no bids,
    // the auction will end without a winner.
    const highestBid = await Bid.findOne({
      auction: item._id
    }).sort({ amount: -1, createdAt: -1 });

    const auction = await Auction.findOneAndUpdate(
      {
        _id: item._id,
        status: { $in: ['scheduled', 'live'] },
        endsAt: { $lte: now }
      },
      {
        $set: {
          status: 'ended',
          winner: highestBid?.bidder ?? null,
          winningBid: highestBid?.amount ?? null
        }
      },
      { new: true }
    );

    if (auction) {
      notifyAuctionUpdate(auction, 'ended');
    }
  }
}

export function startAuctionLifecycle() {
  let running = false;

  const runSafely = async () => {
    // Avoid overlapping runs if a database operation is slow.
    if (running) return;

    running = true;

    try {
      await processAuctionLifecycle();
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        event: 'auction_lifecycle_failed',
        message: error.message
      }));
    } finally {
      running = false;
    }
  };

  // Process existing auctions immediately when the server starts.
  void runSafely();

  // Then check every five seconds.
  const timer = setInterval(runSafely, 5000);

  // Do not let this timer alone prevent Node.js from exiting.
  timer.unref();

  return timer;
}