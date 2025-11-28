const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Match = require('../models/Match');

dotenv.config({ path: '../.env' });

const createMatch = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sugar_dating_app');
    console.log('MongoDB Connected');

    const email1 = process.argv[2];
    const email2 = process.argv[3];

    if (!email1 || !email2) {
      console.error('Usage: node createMatch.js <email1> <email2>');
      process.exit(1);
    }

    const user1 = await User.findOne({ email: email1 });
    const user2 = await User.findOne({ email: email2 });

    if (!user1) {
      console.error(`User not found: ${email1}`);
      process.exit(1);
    }

    if (!user2) {
      console.error(`User not found: ${email2}`);
      process.exit(1);
    }

    console.log(`Matching ${user1.displayName} with ${user2.displayName}...`);

    const match = await Match.findOrCreateMatch(user1._id, user2._id);
    console.log('Match created successfully:', match);

    process.exit(0);
  } catch (error) {
    console.error('Error creating match:', error);
    process.exit(1);
  }
};

createMatch();
