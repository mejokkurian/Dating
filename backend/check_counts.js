const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: __dirname + '/.env' });

async function checkCounts() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mejokkurian06_db_user:Mejokkurian@cluster0.do6pdpz.mongodb.net/test?retryWrites=true&w=majority';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to DB');

    const maleCount = await User.countDocuments({ gender: 'Male' });
    const femaleCount = await User.countDocuments({ gender: 'Female' });
    const totalCount = await User.countDocuments({});

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🙋‍♂️ Males:   ${maleCount}`);
    console.log(`🙋‍♀️ Females: ${femaleCount}`);
    console.log(`📊 Total:   ${totalCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCounts();
