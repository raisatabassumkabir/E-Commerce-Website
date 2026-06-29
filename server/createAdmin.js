require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const connectDB = require('./src/config/db');

async function makeAdmin() {
  await connectDB();
  let admin = await User.findOne({ email: 'admin@example.com' });
  if (!admin) {
    admin = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    await admin.save();
    console.log('Admin user created.');
  } else {
    admin.role = 'admin';
    await admin.save();
    console.log('Existing user updated to admin.');
  }
  process.exit();
}

makeAdmin();
