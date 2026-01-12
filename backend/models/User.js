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
  ethnicity: { type: String },
  occupation: { type: String },
  zodiac: { type: String },
  interests: [{ type: String }],
  
  // Extended Profile
  children: { type: String },
  education: { type: String },
  religion: { type: String },
  politics: { type: String },
  drinking: { type: String },
  smoking: { type: String },
  drugs: { type: String },
  relationshipType: { type: String }, // Monogamy, Non-monogamy, Figuring out
  schoolUniversity: { type: String }, // School or university name
  
  // Media
  photos: [{ type: String }], // URLs
  mainPhotoIndex: { type: Number, default: 0 }, // Index of main photo in photos array
  
  // Status & Flags
  onboardingCompleted: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  subscriptionPlan: { type: String, enum: ['monthly', 'yearly', 'lifetime', null], default: null },
  subscriptionExpiryDate: { type: Date },
  subscriptionPurchaseDate: { type: Date },
  subscriptionProductId: { type: String }, // Store IAP product ID
  isVerified: { type: Boolean, default: false },
  verificationMethod: { type: String, enum: ['kyc', 'image', 'aws-rekognition', 'aws-liveness', 'aws-livness', 'manual', null], default: null },
  verificationDate: { type: Date },
  isVisibleToOthers: { type: Boolean, default: true }, // Profile visibility in discovery
  lastActive: { type: Date, default: Date.now },
  
  // Matchmaking Scores
  popularityRating: { type: Number, default: 0, index: true }, // Incremented on Like
  
  // Location & Connect Now
  connectNowEnabled: { type: Boolean, default: false },
  lastLocation: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number], // [longitude, latitude] for GeoJSON
      validate: {
        validator: function(v) {
          // If coordinates exist, must be array of 2 numbers [lon, lat]
          if (!v) return true; // Allow undefined
          return Array.isArray(v) && v.length === 2 && 
                 typeof v[0] === 'number' && typeof v[1] === 'number' &&
                 v[0] >= -180 && v[0] <= 180 && // longitude range
                 v[1] >= -90 && v[1] <= 90; // latitude range
        },
        message: 'Coordinates must be [longitude, latitude] with valid ranges'
      }
    },
    timestamp: { type: Date }
  },
  locationPrivacy: {
    showExactDistance: { type: Boolean, default: true },
    shareLocation: { type: Boolean, default: true }
  },
  
  // Push Notifications
  pushTokens: [{ 
    token: { type: String, required: true },
    deviceId: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastUsed: { type: Date, default: Date.now }
  }],
  pushNotificationsEnabled: { type: Boolean, default: true },
  notificationPreferences: {
    messages: { type: Boolean, default: true },
    nearbyUsers: { type: Boolean, default: true },
    matches: { type: Boolean, default: true }
  },
  
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

// Pre-save hook to ensure lastLocation is valid or null
userSchema.pre('save', function(next) {
  // If lastLocation exists but doesn't have coordinates, set it to null
  // This prevents MongoDB from trying to index invalid GeoJSON Point structures
  if (this.lastLocation && (!this.lastLocation.coordinates || 
      !Array.isArray(this.lastLocation.coordinates) || 
      this.lastLocation.coordinates.length !== 2)) {
    this.lastLocation = undefined;
  }
  // If lastLocation has coordinates but no type, add type
  if (this.lastLocation && this.lastLocation.coordinates && !this.lastLocation.type) {
    this.lastLocation.type = 'Point';
  }
  next();
});

// Create sparse geospatial index on lastLocation for efficient proximity queries
// Sparse index only indexes documents where the field exists and is valid
userSchema.index({ 'lastLocation': '2dsphere' }, { sparse: true });
userSchema.index({ 'lastLocation.coordinates': '2dsphere' }, { sparse: true });

// Index push tokens for efficient queries
userSchema.index({ 'pushTokens.token': 1 }, { sparse: true });

// Helper methods for push token management
userSchema.methods.addPushToken = function(token, deviceId = null) {
  // Check if token already exists
  const existingIndex = this.pushTokens.findIndex(t => t.token === token);
  
  if (existingIndex >= 0) {
    // Update existing token
    this.pushTokens[existingIndex].lastUsed = new Date();
    if (deviceId) {
      this.pushTokens[existingIndex].deviceId = deviceId;
    }
  } else {
    // Add new token
    this.pushTokens.push({
      token,
      deviceId,
      createdAt: new Date(),
      lastUsed: new Date()
    });
  }
  
  return this.save();
};

userSchema.methods.removePushToken = function(token) {
  this.pushTokens = this.pushTokens.filter(t => t.token !== token);
  return this.save();
};

userSchema.methods.hasValidPushToken = function() {
  return this.pushNotificationsEnabled && 
         this.pushTokens && 
         this.pushTokens.length > 0;
};

userSchema.methods.getPushTokens = function() {
  if (!this.pushNotificationsEnabled || !this.pushTokens || this.pushTokens.length === 0) {
    return [];
  }
  return this.pushTokens.map(t => t.token);
};

module.exports = mongoose.model('User', userSchema);
