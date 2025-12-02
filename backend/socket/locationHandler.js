const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Store active users with their locations for real-time proximity checking
const activeUsers = new Map(); // userId -> { socketId, location, lastUpdate }

// Check for nearby users when location is updated
const checkProximityMatches = async (userId, latitude, longitude, io) => {
  try {
    const currentUser = await User.findById(userId);
    if (!currentUser || !currentUser.connectNowEnabled) {
      return;
    }

    // Find all users with Connect Now enabled within 1km
    const nearbyUsers = await User.find({
      _id: { $ne: userId },
      connectNowEnabled: true,
      'lastLocation.coordinates': { $exists: true, $ne: null },
      'lastLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 1000 // 1km in meters
        }
      }
    }).select('_id displayName image lastLocation locationPrivacy');

    // Calculate distances and notify users
    for (const nearbyUser of nearbyUsers) {
      if (!nearbyUser.lastLocation || !nearbyUser.lastLocation.coordinates) continue;
      
      const [nearbyLon, nearbyLat] = nearbyUser.lastLocation.coordinates;
      const distance = calculateDistance(
        latitude,
        longitude,
        nearbyLat,
        nearbyLon
      );

      // Check if user is within 1km
      if (distance <= 1000) {
        // Notify current user about nearby user
        io.to(userId.toString()).emit('nearby_user_entered', {
          user: {
            _id: nearbyUser._id,
            displayName: nearbyUser.displayName,
            image: nearbyUser.image,
            distance: Math.round(distance),
            showExactDistance: nearbyUser.locationPrivacy?.showExactDistance !== false
          }
        });

        // Also notify the nearby user about current user (if they're also within range)
        const reverseDistance = calculateDistance(
          nearbyLat,
          nearbyLon,
          latitude,
          longitude
        );

        if (reverseDistance <= 1000) {
          io.to(nearbyUser._id.toString()).emit('nearby_user_entered', {
            user: {
              _id: currentUser._id,
              displayName: currentUser.displayName,
              image: currentUser.image,
              distance: Math.round(reverseDistance),
              showExactDistance: currentUser.locationPrivacy?.showExactDistance !== false
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking proximity matches:', error);
  }
};

module.exports = (io) => {
  // Socket.IO middleware for JWT authentication (reuse from chatHandler)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Handle location updates
    socket.on('update_location', async (data) => {
      try {
        const { latitude, longitude } = data;

        if (!latitude || !longitude) {
          socket.emit('location_error', { message: 'Latitude and longitude are required' });
          return;
        }

        // Update user's location in database (GeoJSON format: [longitude, latitude])
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('location_error', { message: 'User not found' });
          return;
        }

        user.lastLocation = {
          type: 'Point',
          coordinates: [longitude, latitude],
          timestamp: new Date()
        };
        await user.save();

        // Store in active users map
        activeUsers.set(userId.toString(), {
          socketId: socket.id,
          location: { latitude, longitude },
          lastUpdate: new Date()
        });

        // Check for proximity matches
        if (user.connectNowEnabled) {
          await checkProximityMatches(userId, latitude, longitude, io);
        }

        socket.emit('location_updated', { success: true });
      } catch (error) {
        console.error('Error updating location:', error);
        socket.emit('location_error', { message: error.message });
      }
    });

    // Handle Connect Now toggle
    socket.on('toggle_connect_now', async (data) => {
      try {
        const { enabled } = data;
        const user = await User.findById(userId);

        if (!user) {
          socket.emit('connect_now_error', { message: 'User not found' });
          return;
        }

        user.connectNowEnabled = enabled === true;
        await user.save();

        socket.emit('connect_now_toggled', { 
          enabled: user.connectNowEnabled 
        });

        // If enabled and user has location, check for nearby users
        if (user.connectNowEnabled && user.lastLocation && user.lastLocation.coordinates) {
          const [lon, lat] = user.lastLocation.coordinates;
          await checkProximityMatches(userId, lat, lon, io);
        }
      } catch (error) {
        console.error('Error toggling Connect Now:', error);
        socket.emit('connect_now_error', { message: error.message });
      }
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      activeUsers.delete(userId.toString());
    });
  });
};

