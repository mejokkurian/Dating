const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const USER_ID = '6961ecdfce5a77e8e05b1f0f';

mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://mejokkurian:Mejo12345@cluster0.wuywc.mongodb.net/dating-app')
  .then(async () => {
    console.log("✅ MongoDB Connected");
    
    try {
        const user = await User.findById(USER_ID);
        if (!user) {
            console.log("❌ User not found");
        } else {
            console.log(`👤 User: ${user.displayName}`);
            console.log(`🔢 Main Photo Index: ${user.mainPhotoIndex}`);
            console.log(`📸 Total Photos: ${user.photos ? user.photos.length : 0}`);
            
            if (user.photos && user.photos.length > 0) {
                console.log("\nPhotos List:");
                user.photos.forEach((p, i) => console.log(`[${i}] ${p}`));
                
                let targetIndex = user.mainPhotoIndex || 0;
                if (targetIndex < 0 || targetIndex >= user.photos.length) {
                    console.log(`⚠️ Invalid Index ${targetIndex}, defaulting to 0`);
                    targetIndex = 0;
                }
                
                console.log("\n✅ BACKEND IS USING THIS URL:");
                console.log(user.photos[targetIndex]);
            } else {
                console.log("❌ No photos found in profile.");
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
  })
  .catch(err => console.error("DB Error:", err));
