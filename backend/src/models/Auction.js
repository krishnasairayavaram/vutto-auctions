import mongoose from 'mongoose';

const auctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  },
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  year: { type: Number, required: true, min: 1950, max: 2100 },
  mileageKm: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: '' },

  startingPrice: { type: Number, required: true, min: 1 },
  currentBid: { type: Number, required: true, min: 1 },
  minIncrement: { type: Number, default: 500, min: 1 },

  currentBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Final result, populated when the auction ends.
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  winningBid: {
    type: Number,
    default: null,
    min: 1
  },

  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true, index: true },

  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

auctionSchema.index({ status: 1, startsAt: 1 });
auctionSchema.index({ status: 1, endsAt: 1 });

export default mongoose.model('Auction', auctionSchema);