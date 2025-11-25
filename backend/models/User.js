const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Auth Fields
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Hashed
  phoneNumber: { type: String, unique: true, sparse: true },
  googleId: { type: String },
  appleId: { type: String },
  
  // Profile Fields
  displayName: { type: String },
  age: { type: Number },
  birthDate: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
  location: { type: String },
  bio: { type: String },
  
  // Preferences & Details
  preferences: { type: String }, // Who they are looking for
  relationshipExpectations: { type: String },
  dealBreakers: { type: String },
  budget: { type: String },
  height: { type: Number }, // in cm
  bodyType: { type: String },
  ethnicity: { type: String },
  occupation: { type: String },
  interests: [{ type: String }],
  
  // Extended Profile
  children: { type: String },
  education: { type: String },
  religion: { type: String },
  politics: { type: String },
  drinking: { type: String },
  smoking: { type: String },
  drugs: { type: String },
  
  // Media
  photos: [{ type: String }], // URLs
  
  // Status & Flags
  onboardingCompleted: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
  
  // Visibility Settings
  visibility: {
    basicInfo: { type: Boolean, default: true },
    gender: { type: Boolean, default: true },
    preferences: { type: Boolean, default: true },
    budget: { type: Boolean, default: true },
    physical: { type: Boolean, default: true },
    background: { type: Boolean, default: true },
    habits: { type: Boolean, default: true },
    interests: { type: Boolean, default: true },
    details: { type: Boolean, default: true },
    photos: { type: Boolean, default: true },
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
