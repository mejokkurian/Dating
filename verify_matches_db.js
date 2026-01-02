const mongoose = require('mongoose');
const Match = require('../backend/models/Match');
const Message = require('../backend/models/Message');
const User = require('../backend/models/User');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const verifyData = async () => {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    // 1. Get recent users
    const users = await User.find().sort({ createdAt: -1 }).limit(5);
    console.log('\n--- Recent Users ---');
    users.forEach(u => console.log(`${u.displayName} (${u._id}) - ${u.email}`));

    if (users.length === 0) {
        console.log("No users found.");
        return;
    }

    // 2. Get matches for the most recent user (likely the one testing)
    const testUser = users[0];
    console.log(`\n--- Checking Matches for ${testUser.displayName} (${testUser._id}) ---`);

    const matches = await Match.find({
      $or: [{ user1Id: testUser._id }, { user2Id: testUser._id }]
    })
    .populate('user1Id', 'displayName')
    .populate('user2Id', 'displayName');

    console.log(`Found ${matches.length} matches.`);

    for (const match of matches) {
      // Logic from my fix
      const id1 = (match.user1Id && match.user1Id._id) ? match.user1Id._id.toString() : match.user1Id.toString();
      const id2 = (match.user2Id && match.user2Id._id) ? match.user2Id._id.toString() : match.user2Id.toString();
      const ids = [id1, id2].sort();
      const computedConversatioId = `${ids[0]}_${ids[1]}`;

      console.log(`\nMatch between ${match.user1Id.displayName} & ${match.user2Id.displayName}`);
      console.log(`Computed Conversation ID: ${computedConversatioId}`);

      // Count messages
      const msgCount = await Message.countDocuments({ conversationId: computedConversatioId });
      console.log(`Messages found with this ID: ${msgCount}`);
      
      if (msgCount > 0) {
          const lastMsg = await Message.findOne({ conversationId: computedConversatioId }).sort({ createdAt: -1 });
          console.log(`Last User Message Content: "${lastMsg.content}"`);
          console.log(`Last User Message Type: ${lastMsg.messageType}`);
      } else {
          // Check if messages exist with the OLD buggy ID? 
          // (Hypothetically if old code did [object Object] sorting)
          // Actually, let's just check if ANY messages exist for these two users
          const allMsgs = await Message.find({
              $or: [
                  { senderId: id1, receiverId: id2 },
                  { senderId: id2, receiverId: id1 }
              ]
          });
          console.log(`Total messages between keys (ignoring convId): ${allMsgs.length}`);
          if (allMsgs.length > 0) {
              console.log(`WARNING: Messages exist but ConversationID might be different!`);
              console.log(`First message convId: ${allMsgs[0].conversationId}`);
          }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

verifyData();
