const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '../.env' });

/**
 * Script to fix malformed lastLocation fields in the User collection
 * This fixes users with invalid GeoJSON Point structures (missing coordinates)
 */
async function fixMalformedLastLocations() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sugar_dating_app');
    console.log('Connected to MongoDB');

    // Find all users with malformed lastLocation
    // A valid GeoJSON Point should have both type and coordinates
    const users = await User.find({}).lean();
    
    let fixedCount = 0;
    let totalChecked = 0;

    for (const user of users) {
      totalChecked++;
      
      // Check if lastLocation is malformed
      const isMalformed = user.lastLocation && (
        !user.lastLocation.coordinates ||
        !Array.isArray(user.lastLocation.coordinates) ||
        user.lastLocation.coordinates.length !== 2 ||
        typeof user.lastLocation.coordinates[0] !== 'number' ||
        typeof user.lastLocation.coordinates[1] !== 'number'
      );

      if (isMalformed) {
        console.log(`Fixing malformed lastLocation for user ${user._id} (${user.email || 'no email'})`);
        
        // Remove the malformed lastLocation
        await User.updateOne(
          { _id: user._id },
          { $unset: { lastLocation: "" } }
        );
        
        fixedCount++;
      }
    }

    console.log(`\n✓ Checked ${totalChecked} users`);
    console.log(`✓ Fixed ${fixedCount} users with malformed lastLocation`);
    
    // Rebuild the sparse index to ensure it's clean
    console.log('\nRebuilding geospatial index...');
    try {
      await User.collection.dropIndex('lastLocation_2dsphere');
      console.log('Dropped existing index');
    } catch (error) {
      if (error.message.includes('index not found')) {
        console.log('Index does not exist, will create new one');
      } else {
        console.error('Error dropping index:', error.message);
      }
    }

    // Create the sparse index again
    await User.collection.createIndex({ 'lastLocation': '2dsphere' }, { sparse: true });
    console.log('✓ Created new sparse geospatial index');

    console.log('\n✓ Cleanup complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing malformed lastLocation:', error);
    process.exit(1);
  }
}

// Run the script
fixMalformedLastLocations();

