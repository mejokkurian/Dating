const mongoose = require('mongoose');
const User = require('./models/User');
const Interaction = require('./models/Interaction');
require('dotenv').config();

const checkInteractions = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('Searching for a user with interactions...');
        
        // Find a user ID that exists in the Interaction collection
        const activeInteraction = await Interaction.findOne();
        
        let targetUser = null;
        if (activeInteraction) {
            targetUser = await User.findById(activeInteraction.userId);
            console.log(`Found active user: ${targetUser.displayName} (${targetUser._id})`);
        } else {
            console.log('No interactions found in the entire database!');
            targetUser = await User.findOne(); // Fallback
        }

        if (!targetUser) {
            console.log('No users found in DB.');
            return;
        }

        console.log(`Checking interactions for user: ${targetUser.displayName} (${targetUser._id})`);

        // 2. Fetch all interactions for this user
        const interactions = await Interaction.find({ userId: targetUser._id });
        console.log(`Found ${interactions.length} interactions.`);
        
        interactions.forEach(i => {
            console.log(`- Action: ${i.action} -> Target: ${i.targetId} (Type: ${typeof i.targetId})`);
        });

        // 3. Check if getMatches query would actually exclude them
        const excludedIds = interactions.map(i => i.targetId);
        
        console.log('\nTesting Query Exclusion...');
        
        const countWithFilter = await User.countDocuments({
            _id: { $ne: targetUser._id, $nin: excludedIds }
        });
        
        const countTotal = await User.countDocuments({
            _id: { $ne: targetUser._id }
        });
        
        console.log(`Total other users: ${countTotal}`);
        console.log(`Users available after filter: ${countWithFilter}`);
        console.log(`Should be excluded: ${countTotal - countWithFilter}`);

        if (interactions.length !== (countTotal - countWithFilter)) {
             console.log('⚠️ WARNING: Interaction count does not match excluded count! Possible existing matches or duplicates?');
        } else {
             console.log('✅ Filter math works correctly.');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        mongoose.connection.close();
    }
};

checkInteractions();
