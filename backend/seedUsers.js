const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config({ path: __dirname + '/.env' });

const seedData = [
  // --- FEMALES (10) ---
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
   {
    email: 'mia@test.com',
    password: 'test123',
    displayName: 'Mia Thomas',
    age: 23,
    gender: 'Female',
    bio: 'Barista & Musician 🎸 Music is my life. Catch me at local gigs or finding the best latte art in town.',
    location: 'Austin, TX',
    occupation: 'Musician',
    education: 'UT Austin',
    height: 160,
    interests: ['Music', 'Guitar', 'Coffee', 'Concerts', 'Vintage', 'Art'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1516522973472-f009f23bba59?w=800',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
      'https://images.unsplash.com/photo-1534751516054-12ee7091df81?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'charlotte@test.com',
    password: 'test123',
    displayName: 'Charlotte White',
    age: 26,
    gender: 'Female',
    bio: 'Marketing Specialist. 📈 Love brainstorming, brunch, and pilates. Always down for a rooftop cocktail.',
    location: 'Chicago, IL',
    occupation: 'Marketing',
    education: 'DePaul University',
    height: 167,
    interests: ['Marketing', 'Pilates', 'Brunch', 'Fashion', 'Socializing', 'Travel'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800',
      'https://images.unsplash.com/photo-1515202913167-d9539d89264c?w=800',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'amelia@test.com',
    password: 'test123',
    displayName: 'Amelia Harris',
    age: 28,
    gender: 'Female',
    bio: 'Nurse 🩺 Caring, energetic, and love helping others. In my free time, I hike, bake, and play with my golden retriever.',
    location: 'Seattle, WA',
    occupation: 'Nurse',
    education: 'University of Washington',
    height: 165,
    interests: ['Nursing', 'Hiking', 'Dogs', 'Baking', 'Nature', 'Movies'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
    {
    email: 'harper@test.com',
    password: 'test123',
    displayName: 'Harper Lewis',
    age: 25,
    gender: 'Female',
    bio: 'Photographer 📷 Capturing moments. Love golden hour, road trips, and indie movies.',
    location: 'Portland, OR',
    occupation: 'Photographer',
    education: 'Arts Institute',
    height: 163,
    interests: ['Photography', 'Travel', 'Art', 'Movies', 'Nature', 'Camping'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
      'https://images.unsplash.com/photo-1512353087810-25dfcd100962?w=800',
      'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'evelyn@test.com',
    password: 'test123',
    displayName: 'Evelyn Clark',
    age: 30,
    gender: 'Female',
    bio: 'Architect 🏗️ Building dreams. Love structured design, chaotic art, and red wine. Fluent in French.',
    location: 'Boston, MA',
    occupation: 'Architect',
    education: 'MIT',
    height: 171,
    interests: ['Architecture', 'Design', 'Art', 'Travel', 'Wine', 'Languages'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1485960994840-902a67e187c8?w=800',
      'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=800',
      'https://images.unsplash.com/photo-1530785602389-07594beb8b73?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },

  // --- MALES (10) ---
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
  },
    {
    email: 'lucas@test.com',
    password: 'test123',
    displayName: 'Lucas Garcia',
    age: 24,
    gender: 'Male',
    bio: 'Personal Trainer 🏋️‍♂️ Health is wealth. Helping people reach their goals. Gym, beach, and protein shakes.',
    location: 'San Diego, CA',
    occupation: 'Personal Trainer',
    education: 'SDSU',
    height: 180,
    interests: ['Fitness', 'Health', 'Sports', 'Cooking', 'Beach', 'Travel'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Female',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520630644346-6aa6b718873d?w=800',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800',
      'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
   {
    email: 'ethan@test.com',
    password: 'test123',
    displayName: 'Ethan Davies',
    age: 35,
    gender: 'Male',
    bio: 'Consultant 📊 Solving problems worldwide. Frequent flyer. Love history, reading, and whiskey.',
    location: 'Boston, MA',
    occupation: 'Strategy Consultant',
    education: 'Harvard Business School',
    height: 183,
    interests: ['Travel', 'Business', 'Reading', 'History', 'Whiskey', 'Networking'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'mason@test.com',
    password: 'test123',
    displayName: 'Mason Wright',
    age: 27,
    gender: 'Male',
    bio: 'Musician & Producer 🎹 Creating beats and vibes. Love festivals, vinyl, and late night studio sessions.',
    location: 'Austin, TX',
    occupation: 'Music Producer',
    education: 'Berklee College of Music',
    height: 176,
    interests: ['Music', 'Production', 'Festivals', 'Art', 'Travel', 'Creativity'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=800',
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
    {
    email: 'logan@test.com',
    password: 'test123',
    displayName: 'Logan Hill',
    age: 22,
    gender: 'Male',
    bio: 'Software Dev 💻 Coding the future. Love video games, sci-fi, and ramen.',
    location: 'Seattle, WA',
    occupation: 'Developer',
    education: 'University of Washington',
    height: 174,
    interests: ['Coding', 'Gaming', 'Sci-Fi', 'Food', 'Technology', 'Anime'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Female',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800',
      'https://images.unsplash.com/photo-1520975661595-64536ef8cb7e?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'henry@test.com',
    password: 'test123',
    displayName: 'Henry Scott',
    age: 33,
    gender: 'Male',
    bio: 'Professor 📚 Teaching history and learning from life. Love museums, antiques, and tea.',
    location: 'London, UK',
    occupation: 'Professor',
    education: 'Oxford',
    height: 179,
    interests: ['History', 'Education', 'Reading', 'Museums', 'Travel', 'Tea'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  
  // --- ADDITIONAL FEMALES (15) ---
  {
    email: 'lily@test.com',
    password: 'test123',
    displayName: 'Lily Chen',
    age: 24,
    gender: 'Female',
    bio: 'Software Engineer 💻 Building the future. Love hackathons, bubble tea, and K-pop.',
    location: 'Seattle, WA',
    occupation: 'Software Engineer',
    education: 'MIT',
    height: 164,
    interests: ['Coding', 'Tech', 'K-pop', 'Gaming', 'Anime', 'Bubble Tea'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Male',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'grace@test.com',
    password: 'test123',
    displayName: 'Grace Thompson',
    age: 31,
    gender: 'Female',
    bio: 'Veterinarian 🐾 Animal lover. Saving furry friends by day, Netflix by night.',
    location: 'Denver, CO',
    occupation: 'Veterinarian',
    education: 'Colorado State University',
    height: 166,
    interests: ['Animals', 'Hiking', 'Nature', 'Dogs', 'Cats', 'Outdoors'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'zoe@test.com',
    password: 'test123',
    displayName: 'Zoe Parker',
    age: 26,
    gender: 'Female',
    bio: 'Fashion Blogger 👗 Style is my language. Love vintage finds and street fashion.',
    location: 'Los Angeles, CA',
    occupation: 'Fashion Blogger',
    education: 'FIT',
    height: 169,
    interests: ['Fashion', 'Photography', 'Travel', 'Vintage', 'Art', 'Blogging'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
      'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=800',
      'https://images.unsplash.com/photo-1492106087820-71f171d08e07?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'natalie@test.com',
    password: 'test123',
    displayName: 'Natalie Rodriguez',
    age: 29,
    gender: 'Female',
    bio: 'Dentist 🦷 Making smiles brighter. Love salsa dancing and trying new restaurants.',
    location: 'Miami, FL',
    occupation: 'Dentist',
    education: 'University of Miami',
    height: 163,
    interests: ['Dentistry', 'Dancing', 'Salsa', 'Food', 'Travel', 'Beach'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800',
      'https://images.unsplash.com/photo-1515202913167-d9539d89264c?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'stella@test.com',
    password: 'test123',
    displayName: 'Stella Kim',
    age: 27,
    gender: 'Female',
    bio: 'Data Scientist 📊 Numbers tell stories. Love puzzles, board games, and craft beer.',
    location: 'San Francisco, CA',
    occupation: 'Data Scientist',
    education: 'Stanford',
    height: 161,
    interests: ['Data Science', 'Math', 'Board Games', 'Craft Beer', 'Puzzles', 'Tech'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800',
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'ruby@test.com',
    password: 'test123',
    displayName: 'Ruby Martinez',
    age: 23,
    gender: 'Female',
    bio: 'Makeup Artist 💄 Creating beauty. Love experimenting with colors and styles.',
    location: 'New York, NY',
    occupation: 'Makeup Artist',
    education: 'Beauty School',
    height: 165,
    interests: ['Makeup', 'Beauty', 'Fashion', 'Art', 'Photography', 'Instagram'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
      'https://images.unsplash.com/photo-1512353087810-25dfcd100962?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'aurora@test.com',
    password: 'test123',
    displayName: 'Aurora Bennett',
    age: 30,
    gender: 'Female',
    bio: 'Psychologist 🧠 Understanding minds. Love reading, meditation, and helping others.',
    location: 'Boston, MA',
    occupation: 'Psychologist',
    education: 'Harvard',
    height: 168,
    interests: ['Psychology', 'Reading', 'Meditation', 'Yoga', 'Wellness', 'Science'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800',
      'https://images.unsplash.com/photo-1485960994840-902a67e187c8?w=800',
      'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'penelope@test.com',
    password: 'test123',
    displayName: 'Penelope Hayes',
    age: 25,
    gender: 'Female',
    bio: 'Flight Attendant ✈️ Traveling the world. Love adventure, languages, and new cultures.',
    location: 'Chicago, IL',
    occupation: 'Flight Attendant',
    education: 'Aviation School',
    height: 170,
    interests: ['Travel', 'Languages', 'Culture', 'Adventure', 'Food', 'Photography'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1530785602389-07594beb8b73?w=800',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'hazel@test.com',
    password: 'test123',
    displayName: 'Hazel Foster',
    age: 28,
    gender: 'Female',
    bio: 'Chef 👩‍🍳 Culinary artist. Love creating fusion dishes and wine pairing.',
    location: 'San Diego, CA',
    occupation: 'Chef',
    education: 'Culinary Institute',
    height: 162,
    interests: ['Cooking', 'Food', 'Wine', 'Travel', 'Culture', 'Art'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Regularly',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'violet@test.com',
    password: 'test123',
    displayName: 'Violet Cooper',
    age: 26,
    gender: 'Female',
    bio: 'Journalist 📰 Chasing stories. Love investigative work, coffee, and late nights.',
    location: 'Washington DC',
    occupation: 'Journalist',
    education: 'Georgetown',
    height: 167,
    interests: ['Journalism', 'Writing', 'Politics', 'Coffee', 'Reading', 'News'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'scarlett@test.com',
    password: 'test123',
    displayName: 'Scarlett Reed',
    age: 32,
    gender: 'Female',
    bio: 'Attorney ⚖️ Fighting for justice. Love debate, running, and true crime podcasts.',
    location: 'New York, NY',
    occupation: 'Attorney',
    education: 'Yale Law',
    height: 171,
    interests: ['Law', 'Politics', 'Running', 'Podcasts', 'Reading', 'Debate'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800',
      'https://images.unsplash.com/photo-1485230405346-71acb9518d9c?w=800',
      'https://images.unsplash.com/photo-1492106087820-71f171d08e07?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'luna@test.com',
    password: 'test123',
    displayName: 'Luna Brooks',
    age: 24,
    gender: 'Female',
    bio: 'Yoga Instructor 🧘‍♀️ Finding balance. Love spirituality, nature, and healthy living.',
    location: 'Portland, OR',
    occupation: 'Yoga Instructor',
    education: 'Yoga Alliance',
    height: 164,
    interests: ['Yoga', 'Meditation', 'Nature', 'Wellness', 'Spirituality', 'Hiking'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Male',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800',
      'https://images.unsplash.com/photo-1515202913167-d9539d89264c?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'ivy@test.com',
    password: 'test123',
    displayName: 'Ivy Morgan',
    age: 27,
    gender: 'Female',
    bio: 'Environmental Scientist 🌍 Saving the planet. Love sustainability and outdoor adventures.',
    location: 'Seattle, WA',
    occupation: 'Environmental Scientist',
    education: 'UC Berkeley',
    height: 166,
    interests: ['Environment', 'Science', 'Hiking', 'Nature', 'Sustainability', 'Camping'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=800',
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'willow@test.com',
    password: 'test123',
    displayName: 'Willow Sanders',
    age: 25,
    gender: 'Female',
    bio: 'Dancer 💃 Moving to the rhythm. Love contemporary dance, music, and expression.',
    location: 'Austin, TX',
    occupation: 'Dancer',
    education: 'Juilliard',
    height: 168,
    interests: ['Dance', 'Music', 'Art', 'Performance', 'Fitness', 'Creativity'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Male',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=800',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800',
      'https://images.unsplash.com/photo-1512353087810-25dfcd100962?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'nova@test.com',
    password: 'test123',
    displayName: 'Nova Price',
    age: 29,
    gender: 'Female',
    bio: 'Astronomer 🔭 Stargazer. Love space, science, and pondering the universe.',
    location: 'Boston, MA',
    occupation: 'Astronomer',
    education: 'MIT',
    height: 165,
    interests: ['Astronomy', 'Science', 'Space', 'Physics', 'Reading', 'Stargazing'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Male',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800',
      'https://images.unsplash.com/photo-1485960994840-902a67e187c8?w=800',
      'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  
  // --- ADDITIONAL MALES (15) ---
  {
    email: 'oliver@test.com',
    password: 'test123',
    displayName: 'Oliver Johnson',
    age: 30,
    gender: 'Male',
    bio: 'Pilot ✈️ Flying high. Love aviation, travel, and adventure sports.',
    location: 'Miami, FL',
    occupation: 'Pilot',
    education: 'Flight School',
    height: 184,
    interests: ['Aviation', 'Travel', 'Adventure', 'Sports', 'Photography', 'Cars'],
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
    isVerified: true
  },
  {
    email: 'sebastian@test.com',
    password: 'test123',
    displayName: 'Sebastian Moore',
    age: 28,
    gender: 'Male',
    bio: 'Photographer 📸 Capturing moments. Love street photography, coffee, and art galleries.',
    location: 'Portland, OR',
    occupation: 'Photographer',
    education: 'Art Institute',
    height: 177,
    interests: ['Photography', 'Art', 'Coffee', 'Travel', 'Culture', 'Design'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800',
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'benjamin@test.com',
    password: 'test123',
    displayName: 'Benjamin Taylor',
    age: 34,
    gender: 'Male',
    bio: 'Surgeon 🏥 Saving lives. Love precision, classical music, and fine dining.',
    location: 'Boston, MA',
    occupation: 'Surgeon',
    education: 'Johns Hopkins',
    height: 186,
    interests: ['Medicine', 'Classical Music', 'Dining', 'Wine', 'Reading', 'Golf'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800',
      'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?w=800',
      'https://images.unsplash.com/photo-1505315570081-30912176b6aa?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'jackson@test.com',
    password: 'test123',
    displayName: 'Jackson White',
    age: 26,
    gender: 'Male',
    bio: 'Firefighter 🚒 Saving lives and fighting fires. Love fitness, BBQ, and outdoor activities.',
    location: 'Austin, TX',
    occupation: 'Firefighter',
    education: 'Fire Academy',
    height: 181,
    interests: ['Fitness', 'Outdoors', 'BBQ', 'Sports', 'Camping', 'Hiking'],
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
    email: 'aiden@test.com',
    password: 'test123',
    displayName: 'Aiden Harris',
    age: 29,
    gender: 'Male',
    bio: 'Marine Biologist 🐠 Exploring the ocean. Love diving, conservation, and adventure.',
    location: 'San Diego, CA',
    occupation: 'Marine Biologist',
    education: 'Scripps Institution',
    height: 179,
    interests: ['Marine Biology', 'Diving', 'Ocean', 'Conservation', 'Travel', 'Photography'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=800',
      'https://images.unsplash.com/photo-1508341591423-4347099e1f19?w=800',
      'https://images.unsplash.com/photo-1507038732509-8b1a9623223a?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'carter@test.com',
    password: 'test123',
    displayName: 'Carter Lewis',
    age: 31,
    gender: 'Male',
    bio: 'Architect 🏗️ Designing the future. Love modern design, travel, and espresso.',
    location: 'Chicago, IL',
    occupation: 'Architect',
    education: 'Yale',
    height: 183,
    interests: ['Architecture', 'Design', 'Travel', 'Coffee', 'Art', 'Photography'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520630644346-6aa6b718873d?w=800',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800',
      'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'wyatt@test.com',
    password: 'test123',
    displayName: 'Wyatt Robinson',
    age: 27,
    gender: 'Male',
    bio: 'Bartender 🍸 Mixing drinks and stories. Love nightlife, music, and meeting people.',
    location: 'Las Vegas, NV',
    occupation: 'Bartender',
    education: 'Bartending School',
    height: 178,
    interests: ['Mixology', 'Music', 'Nightlife', 'Travel', 'Food', 'Socializing'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Female',
    drinking: 'Regularly',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'levi@test.com',
    password: 'test123',
    displayName: 'Levi Walker',
    age: 25,
    gender: 'Male',
    bio: 'Professional Gamer 🎮 Esports athlete. Love gaming, streaming, and energy drinks.',
    location: 'Los Angeles, CA',
    occupation: 'Professional Gamer',
    education: 'Online',
    height: 175,
    interests: ['Gaming', 'Esports', 'Streaming', 'Tech', 'Anime', 'Ramen'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Female',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?w=800',
      'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'owen@test.com',
    password: 'test123',
    displayName: 'Owen Mitchell',
    age: 32,
    gender: 'Male',
    bio: 'Lawyer ⚖️ Defending justice. Love debate, running, and craft cocktails.',
    location: 'New York, NY',
    occupation: 'Lawyer',
    education: 'Columbia Law',
    height: 182,
    interests: ['Law', 'Politics', 'Running', 'Cocktails', 'Reading', 'Travel'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800',
      'https://images.unsplash.com/photo-1520975661595-64536ef8cb7e?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'grayson@test.com',
    password: 'test123',
    displayName: 'Grayson Cooper',
    age: 28,
    gender: 'Male',
    bio: 'Veterinarian 🐕 Animal doctor. Love pets, hiking, and volunteering at shelters.',
    location: 'Denver, CO',
    occupation: 'Veterinarian',
    education: 'Colorado State',
    height: 180,
    interests: ['Animals', 'Hiking', 'Nature', 'Dogs', 'Volunteering', 'Outdoors'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'elijah@test.com',
    password: 'test123',
    displayName: 'Elijah Reed',
    age: 26,
    gender: 'Male',
    bio: 'DJ 🎧 Spinning beats. Love electronic music, festivals, and nightlife.',
    location: 'Miami, FL',
    occupation: 'DJ',
    education: 'Music Production',
    height: 176,
    interests: ['Music', 'DJing', 'Festivals', 'Nightlife', 'Travel', 'Production'],
    relationshipExpectations: 'Casual dating',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'Socially',
    photos: [
      'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=800',
      'https://images.unsplash.com/photo-1535581652167-3d6693c0316d?w=800',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
  },
  {
    email: 'caleb@test.com',
    password: 'test123',
    displayName: 'Caleb Foster',
    age: 33,
    gender: 'Male',
    bio: 'Financial Analyst 📈 Crunching numbers. Love investing, golf, and scotch.',
    location: 'San Francisco, CA',
    occupation: 'Financial Analyst',
    education: 'UC Berkeley',
    height: 185,
    interests: ['Finance', 'Investing', 'Golf', 'Scotch', 'Travel', 'Business'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1499996860823-5214fcc65f8f?w=800',
      'https://images.unsplash.com/photo-1508341591423-4347099e1f19?w=800',
      'https://images.unsplash.com/photo-1507038732509-8b1a9623223a?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'isaac@test.com',
    password: 'test123',
    displayName: 'Isaac Bennett',
    age: 29,
    gender: 'Male',
    bio: 'Mechanical Engineer ⚙️ Building machines. Love robotics, 3D printing, and sci-fi.',
    location: 'Seattle, WA',
    occupation: 'Mechanical Engineer',
    education: 'MIT',
    height: 178,
    interests: ['Engineering', 'Robotics', '3D Printing', 'Sci-Fi', 'Tech', 'Gaming'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1520630644346-6aa6b718873d?w=800',
      'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800',
      'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true
  },
  {
    email: 'nathan@test.com',
    password: 'test123',
    displayName: 'Nathan Price',
    age: 30,
    gender: 'Male',
    bio: 'Entrepreneur 💼 Building startups. Love innovation, networking, and espresso.',
    location: 'Austin, TX',
    occupation: 'Entrepreneur',
    education: 'UT Austin',
    height: 181,
    interests: ['Startups', 'Business', 'Tech', 'Networking', 'Coffee', 'Travel'],
    relationshipExpectations: 'Looking for something serious',
    preferences: 'Female',
    drinking: 'Socially',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
      'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: true,
    isPremium: true
  },
  {
    email: 'theo@test.com',
    password: 'test123',
    displayName: 'Theo Sanders',
    age: 24,
    gender: 'Male',
    bio: 'Fitness Influencer 💪 Inspiring healthy lifestyles. Love gym, meal prep, and motivation.',
    location: 'Los Angeles, CA',
    occupation: 'Fitness Influencer',
    education: 'Personal Training Cert',
    height: 183,
    interests: ['Fitness', 'Health', 'Nutrition', 'Instagram', 'Motivation', 'Sports'],
    relationshipExpectations: 'Open to possibilities',
    preferences: 'Female',
    drinking: 'Rarely',
    smoking: 'No',
    photos: [
      'https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?w=800',
      'https://images.unsplash.com/photo-1520975661595-64536ef8cb7e?w=800',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800'
    ],
    mainPhotoIndex: 0,
    isVerified: false
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
    
    for (const userData of seedData) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create user
      const user = await User.create({
        ...userData,
        password: hashedPassword,
        onboardingCompleted: true,
      });

      console.log(`   Created: ${user.displayName} (${user.gender})`);
    }

    console.log('\n🎉 Seed completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${seedData.length}`);
    console.log('Females: 10');
    console.log('Males: 10');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  }
}

seedUsers();
