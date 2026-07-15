require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

const ADMIN_EMAIL = 'admin@threadhaus.com';
const ADMIN_PASSWORD = 'Admin1234!';

async function makeAdmin() {
  await connectDB();

  // ── Step 1: Remove any stale admin accounts (e.g. old admin@example.com) ──
  const removed = await User.deleteMany({
    role: 'admin',
    email: { $ne: ADMIN_EMAIL },
  });
  if (removed.deletedCount > 0) {
    console.log(`🗑  Removed ${removed.deletedCount} stale admin account(s).`);
  }

  // ── Step 2: Upsert the single canonical admin ─────────────────────────────
  let admin = await User.findOne({ email: ADMIN_EMAIL });

  if (!admin) {
    admin = new User({
      name: 'Admin User',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isVerified: true,
    });
    await admin.save();
    console.log('✅ Admin user created:', ADMIN_EMAIL);
  } else {
    // Ensure credentials & flags are up-to-date
    admin.role = 'admin';
    admin.isVerified = true;
    admin.password = ADMIN_PASSWORD;
    await admin.save();
    console.log('✅ Admin credentials verified & updated:', ADMIN_EMAIL);
  }

  // ── Step 3: Sanity check — exactly one admin must exist ───────────────────
  const adminCount = await User.countDocuments({ role: 'admin' });
  console.log(`📊 Total admin accounts in DB: ${adminCount}`);
  if (adminCount !== 1) {
    console.warn('⚠️  WARNING: Expected exactly 1 admin, found', adminCount);
  }

  process.exit();
}

makeAdmin();

