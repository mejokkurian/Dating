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

module.exports = mongoose.model('User', userSchema);
