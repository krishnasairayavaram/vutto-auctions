import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

try {
  if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Set MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD in .env');
  }
  if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  await mongoose.connect(process.env.MONGODB_URI);
  const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name: process.env.ADMIN_NAME || 'Vutto Admin', email, passwordHash, role: 'admin' } },
    { upsert: true, new: true, runValidators: true }
  );
  console.log(`Admin user ready: ${user.email}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
