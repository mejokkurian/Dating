const mongoose = require('mongoose');
const User = require('./models/User');
const Match = require('./models/Match');
const Message = require('./models/Message');
const Interaction = require('./models/Interaction');
require('dotenv').config({ path: __dirname + '/.env' });

/**
 * Script to delete all users and related data from the database
 * WARNING: This is a destructive operation and cannot be undone!
 */

const deleteAllUsers = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI ||  {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected');

    // Count existing data
    const userCount = await User.countDocuments();
    const matchCount = await Match.countDocuments();
    const messageCount = await Message.countDocuments();
    const interactionCount = await Interaction.countDocuments();

    console.log('\n📊 Current Database State:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Matches: ${matchCount}`);
    console.log(`   Messages: ${messageCount}`);
    console.log(`   Interactions: ${interactionCount}`);

    if (userCount === 0) {
      console.log('\n✨ Database is already empty. Nothing to delete.');
      await mongoose.connection.close();
      return;
    }

    console.log('\n⚠️  WARNING: This will permanently delete all data!');
    console.log('   Starting deletion in 3 seconds...');
    
    // Wait 3 seconds before deletion
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🗑️  Deleting all data...');

    // Delete all related data first
    const deletedMessages = await Message.deleteMany({});
    console.log(`   ✓ Deleted ${deletedMessages.deletedCount} messages`);

    const deletedMatches = await Match.deleteMany({});
    console.log(`   ✓ Deleted ${deletedMatches.deletedCount} matches`);

    const deletedInteractions = await Interaction.deleteMany({});
    console.log(`   ✓ Deleted ${deletedInteractions.deletedCount} interactions`);

    // Finally delete all users
    const deletedUsers = await User.deleteMany({});
    console.log(`   ✓ Deleted ${deletedUsers.deletedCount} users`);

    console.log('\n✅ All users and related data have been successfully deleted!');
    console.log('   Database is now empty.');

    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
    
  } catch (error) {
    console.error('\n❌ Error deleting users:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the deletion
deleteAllUsers();
