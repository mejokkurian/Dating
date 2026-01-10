const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config({ path: __dirname + '/.env' });

const seedData = [
  // --- FEMALES (5) ---
  {
    email: 'emma@test.com',
    password: 'test123',
    displayName: 'Emma Davis',
    age: 24,
    gender: 'Female',
    bio: 'Yoga instructor and wellness enthusiast 🧘‍♀️ Loving life in LA. Passionate about mindfulness, art, and plant-based cooking. Looking for a genuine connection.',
    location: 'Los Angeles, CA',
    occupation: 'Yoga Instructor',
    education: 'UCLA - Fine Arts',
    height: 168,
    interests: ['Yoga', 'Art', 'Meditation', 'Nature', 'Wellness', 'Reading'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male', // Looking for Male
    drinking: 'Rarely',
    smoking: 'No',
    drugs: 'No',
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800', // Portrait
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', // Casual
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'  // Stylish
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'sophia@test.com',
    password: 'test123',
    displayName: 'Sophia Wilson',
    age: 27,
    gender: 'Female',
    bio: 'Interior Designer with a love for minimal aesthetics. 🎨 Coffee addict, museum hopper, and weekend traveler. Let’s explore new places!',
    location: 'New York, NY',
    occupation: 'Interior Designer',
    education: 'Parsons School of Design',
    height: 170,
    interests: ['Design', 'Travel', 'Coffee', 'Museums', 'Fashion', 'Architecture'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'olivia@test.com',
    password: 'test123',
    displayName: 'Olivia Martinez',
    age: 25,
    gender: 'Female',
    bio: 'Digital Nomad & Writer ✍️ Currently based in Miami but constantly on the move. Love salsa dancing, spicy food, and deep conversations.',
    location: 'Miami, FL',
    occupation: 'Freelance Writer',
    education: 'University of Florida',
    height: 165,
    interests: ['Writing', 'Dancing', 'Travel', 'Foodie', 'Beach', 'Literature'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'isabella@test.com',
    password: 'test123',
    displayName: 'Isabella Taylor',
    age: 22,
    gender: 'Female',
    bio: 'Student at Columbia 📚 Aspiring lawyer. Love jazz clubs, vintage fashion, and Central Park strolls. Coffee date?',
    location: 'New York, NY',
    occupation: 'Law Student',
    education: 'Columbia University',
    height: 162,
    interests: ['Politics', 'Jazz', 'Fashion', 'Reading', 'Running', 'Coffee'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
      'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=800',
      'https://images.unsplash.com/photo-1492106087820-71f171d08e07?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'ava@test.com',
    password: 'test123',
    displayName: 'Ava Anderson',
    age: 29,
    gender: 'Female',
    bio: 'Tech Project Manager 👩‍💻 Efficient, ambitious, and always planning the next trip. Love hiking, skiing, and wine tasting.',
    location: 'San Francisco, CA',
    occupation: 'Project Manager',
    education: 'UC Berkeley',
    height: 172,
    interests: ['Tech', 'Hiking', 'Skiing', 'Wine', 'Travel', 'Cooking'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      'https://images.unsplash.com/photo-1523902319083-d586d306b998?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },

  // --- MALES (5) ---
  {
    email: 'mike@test.com',
    password: 'test123',
    displayName: 'Mike Anderson',
    age: 29,
    gender: 'Male',
    bio: 'Tech entrepreneur & fitness enthusiast 💪 Startups, gym, and good food. Swipe right if you can keep up!',
    location: 'San Francisco, CA',
    occupation: 'Founder',
    education: 'Stanford University',
    height: 182,
    interests: ['Startups', 'Fitness', 'Tech', 'Food', 'Basketball', 'Travel'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'james@test.com',
    password: 'test123',
    displayName: 'James Wilson',
    age: 28,
    gender: 'Male',
    bio: 'Investment Banker 💼 Work hard, play hard. Love golf, fine dining, and weekend getaways.',
    location: 'New York, NY',
    occupation: 'Investment Banker',
    education: 'Wharton School',
    height: 185,
    interests: ['Finance', 'Golf', 'Dining', 'Travel', 'Investing', 'Skiing'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'alex@test.com',
    password: 'test123',
    displayName: 'Alex Martinez',
    age: 31,
    gender: 'Male',
    bio: 'Executive Chef 👨‍🍳 Food is my love language. Creating experiences in the kitchen and out. Looking for someone with an appetite for life.',
    location: 'Miami, FL',
    occupation: 'Chef',
    education: 'Culinary Institute',
    height: 178,
    interests: ['Cooking', 'Food', 'Wine', 'Travel', 'Music', 'Culture'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Regularly',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800',
      'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=800',
      'https://images.unsplash.com/photo-1505315570081-30912176b6aa?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'daniel@test.com',
    password: 'test123',
    displayName: 'Daniel Kim',
    age: 26,
    gender: 'Male',
    bio: 'Graphic Designer 🎨 Creative soul. Love collecting vinyl, street art, and gaming. Ready for player two?',
    location: 'Los Angeles, CA',
    occupation: 'Graphic Designer',
    education: 'ArtCenter',
    height: 175,
    interests: ['Design', 'Art', 'Gaming', 'Music', 'Vinyl', 'Movies'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=800',
      'https://images.unsplash.com/photo-1535581652167-3d6693c0316d?w=800',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'william@test.com',
    password: 'test123',
    displayName: 'William Brown',
    age: 32,
    gender: 'Male',
    bio: 'Real Estate Developer 🏙️ Passion for building cities. Love architecture, sailing, and cigars.',
    location: 'Chicago, IL',
    occupation: 'Developer',
    education: 'Northwestern',
    height: 188,
    interests: ['Real Estate', 'Architecture', 'Sailing', 'Travel', 'Business', 'Golf'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'Occasionally',
    photos: [
      'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=800',
      'https://images.unsplash.com/photo-1508341591423-4347099e1f19?w=800',
      'https://images.unsplash.com/photo-1507038732509-8b1a9623223a?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  }
];

async function seedUsers() {
  try {
    // MongoDB URI
    const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mejokkurian06_db_user:Mejokkurian@cluster0.do6pdpz.mongodb.net/test?retryWrites=true&w=majority';
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected.');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    const Match = require('./models/Match');
    const Interaction = require('./models/Interaction');
    
    await User.deleteMany({});
    await Match.deleteMany({});
    await Interaction.deleteMany({});
    console.log('✅ User, Match, and Interaction collections cleared.');

    // Seed new users
    console.log(`🌱 Seeding ${seedData.length} new users...`);
    
    // Coordinate mapping for cities
    const cityCoordinates = {
      'Los Angeles, CA': [-118.2437, 34.0522],
      'New York, NY': [-74.0060, 40.7128],
      'Miami, FL': [-80.1918, 25.7617],
      'San Francisco, CA': [-122.4194, 37.7749],
      'Austin, TX': [-97.7431, 30.2672],
      'Chicago, IL': [-87.6298, 41.8781],
      'Seattle, WA': [-122.3321, 47.6062],
      'Portland, OR': [-122.6765, 45.5231],
      'Boston, MA': [-71.0589, 42.3601],
      'San Diego, CA': [-117.1611, 32.7157],
      'Denver, CO': [-104.9903, 39.7392],
      'Washington DC': [-77.0369, 38.9072],
      'London, UK': [-0.1276, 51.5074]
    };

    const getJitteredCoordinates = (city) => {
      const coords = cityCoordinates[city];
      if (!coords) return null;
      // Add small random jitter (approx 0-2km)
      return [
        coords[0] + (Math.random() - 0.5) * 0.04,
        coords[1] + (Math.random() - 0.5) * 0.04
      ];
    };

    for (const userData of seedData) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Get Coordinates
      const coordinates = getJitteredCoordinates(userData.location);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        onboardingCompleted: true,
        lastLocation: coordinates ? {
          type: 'Point',
          coordinates: coordinates,
          timestamp: new Date()
        } : undefined
      });

      console.log(`   Created: ${user.displayName} (${user.gender})`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${seedData.length}`);
    console.log('Females: 5');
    console.log('Males: 5');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
