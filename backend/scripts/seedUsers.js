const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '../.env') });

const TEST_PASSWORD = 'Test1234!';

const users = [
  {
    email: 'sophia.chen@test.com',
    displayName: 'Sophia',
    age: 26,
    birthDate: new Date('1998-05-14'),
    gender: 'Female',
    location: 'New York, NY',
    bio: 'Art curator by day, adventurer by night. Looking for someone who appreciates the finer things.',
    preferences: 'Male',
    relationshipExpectations: 'Long-term',
    budget: '$5,000 - $10,000/month',
    height: 165,
    ethnicity: 'Asian',
    occupation: 'Art Curator',
    zodiac: 'Taurus',
    interests: ['Art', 'Travel', 'Wine', 'Yoga', 'Photography'],
    children: 'No',
    education: "Master's Degree",
    religion: 'Spiritual',
    drinking: 'Socially',
    smoking: 'Never',
    relationshipType: 'Monogamy',
    onboardingCompleted: true,
    isPremium: false,
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-73.9857, 40.7484], // NYC
      timestamp: new Date(),
    },
    connectNowEnabled: true,
    popularityRating: 42,
  },
  {
    email: 'james.harrington@test.com',
    displayName: 'James',
    age: 38,
    birthDate: new Date('1987-09-22'),
    gender: 'Male',
    location: 'Los Angeles, CA',
    bio: 'Tech entrepreneur with a passion for travel and good food. Fluent in 3 languages.',
    preferences: 'Female',
    relationshipExpectations: 'Casual',
    budget: '$15,000+/month',
    height: 183,
    ethnicity: 'White',
    occupation: 'Entrepreneur',
    zodiac: 'Virgo',
    interests: ['Travel', 'Fine Dining', 'Tennis', 'Cars', 'Tech'],
    children: 'No',
    education: "Bachelor's Degree",
    religion: 'None',
    drinking: 'Regularly',
    smoking: 'Never',
    relationshipType: 'Figuring out',
    onboardingCompleted: true,
    isPremium: true,
    subscriptionPlan: 'monthly',
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522], // LA
      timestamp: new Date(),
    },
    connectNowEnabled: false,
    popularityRating: 18,
  },
  {
    email: 'isabella.mora@test.com',
    displayName: 'Isabella',
    age: 24,
    birthDate: new Date('2001-02-08'),
    gender: 'Female',
    location: 'Miami, FL',
    bio: 'Model & fitness coach. Love beach sunsets, salsa dancing, and spontaneous adventures.',
    preferences: 'Male',
    relationshipExpectations: 'Long-term',
    budget: '$3,000 - $5,000/month',
    height: 170,
    ethnicity: 'Hispanic',
    occupation: 'Model / Fitness Coach',
    zodiac: 'Aquarius',
    interests: ['Fitness', 'Dancing', 'Beach', 'Fashion', 'Cooking'],
    children: 'No',
    education: "Bachelor's Degree",
    religion: 'Catholic',
    drinking: 'Socially',
    smoking: 'Never',
    relationshipType: 'Monogamy',
    onboardingCompleted: true,
    isPremium: false,
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-80.1918, 25.7617], // Miami
      timestamp: new Date(),
    },
    connectNowEnabled: true,
    popularityRating: 67,
  },
  {
    email: 'michael.ross@test.com',
    displayName: 'Michael',
    age: 45,
    birthDate: new Date('1980-11-30'),
    gender: 'Male',
    location: 'Chicago, IL',
    bio: 'Investment banker, art collector. Looking for a genuine connection with someone ambitious.',
    preferences: 'Female',
    relationshipExpectations: 'Long-term',
    budget: '$20,000+/month',
    height: 178,
    ethnicity: 'White',
    occupation: 'Investment Banker',
    zodiac: 'Sagittarius',
    interests: ['Art', 'Golf', 'Sailing', 'Jazz', 'Philanthropy'],
    children: 'No',
    education: 'MBA',
    religion: 'Christian',
    drinking: 'Socially',
    smoking: 'Never',
    relationshipType: 'Monogamy',
    onboardingCompleted: true,
    isPremium: true,
    subscriptionPlan: 'yearly',
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-87.6298, 41.8781], // Chicago
      timestamp: new Date(),
    },
    connectNowEnabled: false,
    popularityRating: 9,
  },
  {
    email: 'anika.patel@test.com',
    displayName: 'Anika',
    age: 29,
    birthDate: new Date('1996-07-19'),
    gender: 'Female',
    location: 'San Francisco, CA',
    bio: 'Software engineer by trade, foodie by heart. Love hiking and discovering hidden gems.',
    preferences: 'Male',
    relationshipExpectations: 'Long-term',
    budget: '$2,000 - $5,000/month',
    height: 162,
    ethnicity: 'South Asian',
    occupation: 'Software Engineer',
    zodiac: 'Cancer',
    interests: ['Hiking', 'Food', 'Technology', 'Reading', 'Travel'],
    children: 'No',
    education: "Master's Degree",
    religion: 'Hindu',
    drinking: 'Occasionally',
    smoking: 'Never',
    relationshipType: 'Monogamy',
    onboardingCompleted: true,
    isPremium: false,
    isVerified: false,
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749], // SF
      timestamp: new Date(),
    },
    connectNowEnabled: false,
    popularityRating: 22,
  },
  {
    email: 'oliver.knight@test.com',
    displayName: 'Oliver',
    age: 33,
    birthDate: new Date('1992-03-05'),
    gender: 'Male',
    location: 'New York, NY',
    bio: 'Real estate developer. Gym enthusiast, home chef, weekend pilot.',
    preferences: 'Female',
    relationshipExpectations: 'Casual',
    budget: '$8,000 - $15,000/month',
    height: 186,
    ethnicity: 'Black',
    occupation: 'Real Estate Developer',
    zodiac: 'Pisces',
    interests: ['Aviation', 'Cooking', 'Fitness', 'Architecture', 'Music'],
    children: 'No',
    education: "Bachelor's Degree",
    religion: 'None',
    drinking: 'Socially',
    smoking: 'Never',
    relationshipType: 'Non-monogamy',
    onboardingCompleted: true,
    isPremium: true,
    subscriptionPlan: 'monthly',
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-73.9857, 40.7484], // NYC
      timestamp: new Date(),
    },
    connectNowEnabled: true,
    popularityRating: 31,
  },
  {
    email: 'claire.dupont@test.com',
    displayName: 'Claire',
    age: 27,
    birthDate: new Date('1998-12-01'),
    gender: 'Female',
    location: 'Los Angeles, CA',
    bio: 'Actress & writer. Paris-born, LA-based. Passionate about film, fashion, and philosophy.',
    preferences: 'Male',
    relationshipExpectations: 'Long-term',
    budget: '$5,000 - $10,000/month',
    height: 168,
    ethnicity: 'White',
    occupation: 'Actress / Writer',
    zodiac: 'Sagittarius',
    interests: ['Film', 'Fashion', 'Philosophy', 'Wine', 'Yoga'],
    children: 'No',
    education: "Bachelor's Degree",
    religion: 'Agnostic',
    drinking: 'Socially',
    smoking: 'Occasionally',
    relationshipType: 'Figuring out',
    onboardingCompleted: true,
    isPremium: false,
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522], // LA
      timestamp: new Date(),
    },
    connectNowEnabled: true,
    popularityRating: 55,
  },
  {
    email: 'david.kim@test.com',
    displayName: 'David',
    age: 41,
    birthDate: new Date('1984-06-15'),
    gender: 'Male',
    location: 'Seattle, WA',
    bio: 'VC partner & startup advisor. Weekend surfer. Looking for someone who values depth over surface.',
    preferences: 'Female',
    relationshipExpectations: 'Long-term',
    budget: '$10,000 - $20,000/month',
    height: 180,
    ethnicity: 'Asian',
    occupation: 'Venture Capitalist',
    zodiac: 'Gemini',
    interests: ['Surfing', 'Investing', 'Meditation', 'Travel', 'Reading'],
    children: 'No',
    education: 'MBA',
    religion: 'Buddhist',
    drinking: 'Rarely',
    smoking: 'Never',
    relationshipType: 'Monogamy',
    onboardingCompleted: true,
    isPremium: true,
    subscriptionPlan: 'yearly',
    isVerified: true,
    verificationMethod: 'manual',
    isVisibleToOthers: true,
    lastLocation: {
      type: 'Point',
      coordinates: [-122.3321, 47.6062], // Seattle
      timestamp: new Date(),
    },
    connectNowEnabled: false,
    popularityRating: 14,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sugar_dating_app');
    console.log('MongoDB connected');

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

    let created = 0;
    let skipped = 0;

    for (const userData of users) {
      const existing = await User.findOne({ email: userData.email });
      if (existing) {
        console.log(`  SKIP  ${userData.email} (already exists)`);
        skipped++;
        continue;
      }

      await User.create({ ...userData, password: passwordHash });
      console.log(`  OK    ${userData.email} — ${userData.displayName}, ${userData.age}`);
      created++;
    }

    console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
    console.log(`Password for all seeded users: ${TEST_PASSWORD}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seed();
