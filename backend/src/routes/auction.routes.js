
import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

import Auction from '../models/Auction.js';
import Bid from '../models/Bid.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getIO } from '../socket.js';

const router = Router();

// Cloudinary configuration.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Allow only JPG, PNG and WebP images up to 5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Only JPG, PNG, and WebP images are allowed.')
      );
    }

    callback(null, true);
  }
});

// Upload an image buffer to Cloudinary.
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'vutto-auctions/motorcycles',
        resource_type: 'image'
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

// ADMIN: Upload a motorcycle image.
router.post(
  '/upload-image',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Please select a motorcycle image.'
        });
      }

      if (
        !process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET
      ) {
        return res.status(500).json({
          message: 'Cloudinary is not configured on the server.'
        });
      }

      const result = await uploadToCloudinary(req.file.buffer);

      return res.status(201).json({
        message: 'Image uploaded successfully.',
        imageUrl: result.secure_url
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET all auctions.
router.get('/', async (req, res, next) => {
  try {
    const validStatuses = [
      'scheduled',
      'live',
      'ended',
      'cancelled'
    ];

    if (
      req.query.status &&
      !validStatuses.includes(req.query.status)
    ) {
      return res.status(400).json({
        message: 'Invalid auction status.'
      });
    }

    const filter = req.query.status
      ? { status: req.query.status }
      : { status: { $ne: 'cancelled' } };

    const auctions = await Auction.find(filter)
      .sort({ endsAt: 1 })
      .limit(100)
      .populate('currentBidder', 'name');

    return res.json({ auctions });
  } catch (error) {
    next(error);
  }
});

// GET one auction and its recent bids.
router.get('/:id', async (req, res, next) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('currentBidder', 'name')
      .populate('winner', 'name');

    if (!auction) {
      return res.status(404).json({
        message: 'Auction not found.'
      });
    }

    const bids = await Bid.find({ auction: auction._id })
      .sort({ amount: -1, createdAt: -1 })
      .limit(20)
      .populate('bidder', 'name');

    return res.json({ auction, bids });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        message: 'Auction not found.'
      });
    }

    next(error);
  }
});

// ADMIN: Create an auction.
router.post(
  '/',
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const {
        title,
        description,
        make,
        model,
        year,
        mileageKm,
        imageUrl,
        startingPrice,
        minIncrement,
        startsAt,
        endsAt
      } = req.body;

      const cleanTitle =
        typeof title === 'string' ? title.trim() : '';

      const cleanDescription =
        typeof description === 'string'
          ? description.trim()
          : '';

      const cleanMake =
        typeof make === 'string' ? make.trim() : '';

      const cleanModel =
        typeof model === 'string' ? model.trim() : '';

      if (
        !cleanTitle ||
        !cleanDescription ||
        !cleanMake ||
        !cleanModel
      ) {
        return res.status(400).json({
          message:
            'Title, description, make, and model are required.'
        });
      }

      const price = Number(startingPrice);
      const increment =
        minIncrement === undefined ||
        minIncrement === null ||
        minIncrement === ''
          ? 500
          : Number(minIncrement);

      const numericYear = Number(year);
      const numericMileage = Number(mileageKm);

      if (!Number.isSafeInteger(price) || price < 1) {
        return res.status(400).json({
          message: 'Starting price must be a positive whole number.'
        });
      }

      if (
        !Number.isSafeInteger(increment) ||
        increment < 1
      ) {
        return res.status(400).json({
          message:
            'Minimum increment must be a positive whole number.'
        });
      }

      const currentYear = new Date().getFullYear();

      if (
        !Number.isInteger(numericYear) ||
        numericYear < 1885 ||
        numericYear > currentYear + 1
      ) {
        return res.status(400).json({
          message: 'Please provide a valid motorcycle year.'
        });
      }

      if (
        !Number.isSafeInteger(numericMileage) ||
        numericMileage < 0
      ) {
        return res.status(400).json({
          message: 'Mileage must be a non-negative whole number.'
        });
      }

      const start = new Date(startsAt);
      const end = new Date(endsAt);

      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start
      ) {
        return res.status(400).json({
          message:
            'Auction end time must be after its start time.'
        });
      }

      const now = new Date();

      const status =
        start > now
          ? 'scheduled'
          : end > now
            ? 'live'
            : 'ended';

      const auction = await Auction.create({
        title: cleanTitle,
        description: cleanDescription,
        make: cleanMake,
        model: cleanModel,
        year: numericYear,
        mileageKm: numericMileage,
        imageUrl: imageUrl || '',
        startingPrice: price,
        currentBid: price,
        minIncrement: increment,
        startsAt: start,
        endsAt: end,
        status,
        createdBy: req.user._id
      });

      // Notify connected clients about the new auction.
      getIO()?.emit('auction:updated', {
        auctionId: auction._id.toString(),
        currentBid: auction.currentBid,
        status: auction.status
      });

      return res.status(201).json({ auction });
    } catch (error) {
      next(error);
    }
  }
);

// USER: Place a bid.
router.post(
  '/:id/bids',
  requireAuth,
  async (req, res, next) => {
    try {
      const amount = Number(req.body.amount);

      if (!Number.isSafeInteger(amount) || amount < 1) {
        return res.status(400).json({
          message: 'Bid amount must be a positive whole number.'
        });
      }

      const current = await Auction.findById(req.params.id);

      if (!current) {
        return res.status(404).json({
          message: 'Auction not found.'
        });
      }

      // Users cannot bid on their own auctions.
      if (String(current.createdBy) === String(req.user._id)) {
        return res.status(403).json({
          message: 'You cannot bid on your own auction.'
        });
      }

      const now = new Date();

      if (
        current.status !== 'live' ||
        current.startsAt > now ||
        current.endsAt <= now
      ) {
        return res.status(409).json({
          message:
            'This auction is not currently accepting bids.'
        });
      }

      const minimum =
        current.currentBid + current.minIncrement;

      if (amount < minimum) {
        return res.status(400).json({
          message:
            `Your bid must be at least ₹${minimum.toLocaleString('en-IN')}.`
        });
      }

      // Conditional update prevents a lower concurrent bid
      // from overwriting a higher accepted bid.
      const updated = await Auction.findOneAndUpdate(
        {
          _id: current._id,
          status: 'live',
          startsAt: { $lte: now },
          endsAt: { $gt: now },
          currentBid: {
            $lte: amount - current.minIncrement
          }
        },
        {
          $set: {
            currentBid: amount,
            currentBidder: req.user._id
          }
        },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(409).json({
          message:
            'Another bid was accepted first, or the auction has closed. Refresh and try again.'
        });
      }

      // Save the accepted bid to bid history.
      const savedBid = await Bid.create({
        auction: updated._id,
        bidder: req.user._id,
        amount
      });

      const payload = {
        auctionId: updated._id.toString(),
        currentBid: updated.currentBid,
        bidder: {
          id: req.user._id.toString(),
          name: req.user.name
        },
        bidId: savedBid._id.toString()
      };

      // Update clients viewing this auction's detail page.
      getIO()
        ?.to(`auction:${updated._id}`)
        .emit('bid:updated', payload);

      // Update auction cards across all connected clients.
      getIO()?.emit('auction:updated', {
        auctionId: updated._id.toString(),
        currentBid: updated.currentBid,
        status: updated.status
      });

      return res.status(201).json({
        message: 'Bid placed successfully.',
        auction: updated,
        bid: payload
      });
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json({
          message: 'Auction not found.'
        });
      }

      next(error);
    }
  }
);

export default router;
