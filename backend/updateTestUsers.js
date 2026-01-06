const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: __dirname + '/.env' });

async function updateTestUsers() {
  try {
    const MONGO_URI = process.env.MONGO_URI 
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const testEmails = ['sarah@test.com', 'mike@test.com', 'emma@test.com', 'alex@test.com'];
    
    const result = await User.updateMany(
      { email: { $in: testEmails } },
      { $set: { onboardingCompleted: true } }
    );

    console.log(`✅ Updated ${result.modifiedCount} test users with onboardingCompleted: true`);
    
    // Verify the update
    const users = await User.find({ email: { $in: testEmails } }, 'email displayName onboardingCompleted');
    console.log('\n📋 Updated Users:');
    users.forEach(user => {
      console.log(`  ${user.displayName} (${user.email}): onboardingCompleted = ${user.onboardingCompleted}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating users:', error);
    process.exit(1);
  }
}

updateTestUsers();
