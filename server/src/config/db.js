const mongoose = require('mongoose');

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error('❌  MONGO_URI is not defined in environment variables');
    process.exit(1);
  }

  let retries = 5;

  while (retries) {
    try {
      const conn = await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`✅  MongoDB connected: ${conn.connection.host}`);
      break;
    } catch (err) {
      retries -= 1;
      console.error(`❌  MongoDB connection failed. Retries left: ${retries}`);
      console.error(err.message);

      if (retries === 0) {
        console.error('❌  Could not connect to MongoDB. Exiting.');
        process.exit(1);
      }

      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;
