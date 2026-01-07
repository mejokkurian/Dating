const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: __dirname + '/.env' });

async function checkDuplicates() {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mejokkurian06_db_user:Mejokkurian@cluster0.do6pdpz.mongodb.net/test?retryWrites=true&w=majority';
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to DB, scanning for duplicates...');

    // Aggregation pipeline to find duplicates by email
    const duplicates = await User.aggregate([
      {
        $group: {
          _id: { email: "$email" }, // Group by email
          uniqueIds: { $addToSet: "$_id" },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (duplicates.length === 0) {
        console.log('✅ NO DUPLICATES FOUND.');
        console.log('   All user emails are unique.');
    } else {
        console.log('⚠️ DUPLICATES FOUND:');
        duplicates.forEach(doc => {
            console.log(`   Email: ${doc._id.email} | Count: ${doc.count}`);
        });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicates();
