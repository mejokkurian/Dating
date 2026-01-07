const mongoose = require('mongoose');
const User = require('./models/User');
const Match = require('./models/Match');
const Interaction = require('./models/Interaction');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const debugMatchQuery = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // 1. Get the most recent user (The one having issues)
    const currentUser = await User.findOne().sort({ createdAt: -1 });

    if (!currentUser) {
        console.log("❌ No users found in DB.");
        return;
    }

    console.log('\n--- Current User Debug ---');
    console.log(`ID: ${currentUser._id}`);
    console.log(`Name: ${currentUser.displayName}`);
    console.log(`Gender: '${currentUser.gender}'`);
    console.log(`Preferences: '${currentUser.preferences}'`);
    console.log(`OnboardingCompleted: ${currentUser.onboardingCompleted}`);

    // 2. Replicate getPotentialMatches logic
    const existingMatches = await Match.find({
      $or: [{ user1Id: currentUser._id }, { user2Id: currentUser._id }],
    });
    const excludedMatchIds = existingMatches.map(m => 
        m.user1Id.toString() === currentUser._id.toString() ? m.user2Id : m.user1Id
    );

    const interactions = await Interaction.find({ userId: currentUser._id });
    const interactedUserIds = interactions.map(i => i.targetId);

    const allExcludedIds = [...new Set([
        currentUser._id.toString(), 
        ...excludedMatchIds.map(id => id.toString()), 
        ...interactedUserIds.map(id => id.toString())
    ])];

    console.log(`\n--- Exclusions ---`);
    console.log(`Excluded Count: ${allExcludedIds.length}`);
    // console.log(`Excluded IDs: ${allExcludedIds}`);

    // 3. Build Query
    let genderFilter = {};
    if (currentUser.preferences && currentUser.preferences !== 'Everyone') {
        genderFilter = { gender: currentUser.preferences };
    }

    const query = {
        _id: { $nin: allExcludedIds },
        onboardingCompleted: true,
        displayName: { $exists: true },
        age: { $exists: true },
        ...genderFilter
    };

    console.log(`\n--- Query Debug ---`);
    console.log('Filter:', JSON.stringify(query, null, 2));

    // 4. Run Query
    const count = await User.countDocuments(query);
    console.log(`\n✅ Potential Matches Found: ${count}`);

    if (count === 0) {
        console.log("\n⚠️ Why 0? Checking potential blockers...");
        
        // Check 1: Is there ANYONE with onboardingCompleted: true?
        const totalActive = await User.countDocuments({ onboardingCompleted: true });
        console.log(`Total active users (onboardingCompleted=true): ${totalActive}`);

        // Check 2: Gender Mismatch?
        if (genderFilter.gender) {
            const genderCount = await User.countDocuments({ 
                gender: genderFilter.gender, 
                onboardingCompleted: true 
            });
            console.log(`Users matching gender '${genderFilter.gender}': ${genderCount}`);
            
            if (genderCount === 0) {
                console.log("   -> No users match the gender preference. Check case sensitivity!");
                const distinctGenders = await User.distinct('gender');
                console.log("   -> Available genders in DB:", distinctGenders);
            }
        }
    } else {
        const sample = await User.findOne(query).select('displayName gender');
        console.log("Sample result:", sample);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

debugMatchQuery();
