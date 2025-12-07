# Feature Analysis: Node.js Backend

## Executive Summary

The Node.js backend is built with Express.js and follows an MVC (Model-View-Controller) architecture pattern. It provides a RESTful API for the mobile application and uses Socket.IO for real-time communication. The backend handles user authentication, messaging, location tracking, matching, and push notifications via Expo Push Notification Service.

**Key Technologies:**

- Express.js (REST API)
- Socket.IO (Real-time communication)
- MongoDB with Mongoose (Database)
- Expo Server SDK (Push Notifications)
- JWT (Authentication)

**Architecture Pattern:** MVC with service layer for business logic

---

## Project Structure

```
backend/
├── config/
│   └── cloudinary.js          # Cloudinary image upload configuration
├── controllers/
│   ├── authController.js      # Authentication logic (register, login, OTP)
│   ├── chatController.js      # Chat message operations
│   ├── locationController.js  # Location updates, nearby users, Quick Hello
│   ├── matchController.js     # Match management
│   ├── uploadController.js    # File/image upload handling
│   ├── userController.js      # User profile operations, push token registration
│   └── verificationController.js  # KYC verification
├── middleware/
│   └── authMiddleware.js      # JWT authentication middleware
├── models/
│   ├── Interaction.js         # User swipe interactions (likes, passes)
│   ├── Match.js               # Match between users
│   ├── Message.js             # Chat messages
│   └── User.js                # User model with push token fields
├── routes/
│   ├── authRoutes.js          # Authentication endpoints
│   ├── chatRoutes.js          # Chat endpoints
│   ├── locationRoutes.js      # Location endpoints
│   ├── matchRoutes.js         # Match endpoints
│   ├── uploadRoutes.js        # Upload endpoints
│   ├── userRoutes.js          # User endpoints (including push-token)
│   └── verificationRoutes.js  # Verification endpoints
├── services/
│   ├── notifications/
│   │   ├── notificationFactory.js  # Creates notification payloads
│   │   └── notificationTypes.js    # Notification type constants
│   ├── pushNotificationService.js  # Main push notification service
│   └── twilioService.js       # SMS/OTP service (Twilio)
├── socket/
│   ├── chatHandler.js         # Socket.IO chat handlers
│   └── locationHandler.js     # Socket.IO location handlers
├── scripts/
│   ├── createMatch.js         # Utility script
│   └── fixMalformedLastLocation.js  # Data migration script
├── server.js                  # Main server entry point
└── package.json               # Dependencies and scripts
```

---

## Architecture Overview

### Design Patterns

1. **MVC Pattern:**

   - **Models**: Mongoose schemas defining data structure
   - **Views**: JSON responses (REST API)
   - **Controllers**: Business logic and request handling
   - **Routes**: Endpoint definitions

2. **Service Layer Pattern:**

   - Business logic separated into service classes
   - `PushNotificationService`: Singleton pattern for notification sending
   - `NotificationFactory`: Factory pattern for creating notification payloads

3. **Middleware Pattern:**
   - `authMiddleware.js`: Protects routes with JWT validation
   - Express middleware chain for request processing

### Data Flow

```
Client Request → Express Middleware → Route → Controller → Service/Model → Database
                                                                      ↓
Real-time Events: Client Socket → Socket.IO Handler → Service/Model → Database
                                                                      ↓
Push Notifications: Event Trigger → NotificationFactory → PushNotificationService → Expo API → Device
```

### Component Interaction

```
┌─────────────────┐
│   Socket.IO     │ ───┐
│   Handlers      │    │
└─────────────────┘    │
                       │
┌─────────────────┐    │    ┌──────────────────────┐
│   Controllers   │ ───┼───→│ PushNotificationService│
└─────────────────┘    │    └──────────────────────┘
                       │              │
                       │              ↓
┌─────────────────┐    │    ┌──────────────────────┐
│     Models      │ ───┘    │ NotificationFactory   │
│   (Mongoose)    │         └──────────────────────┘
└─────────────────┘
```

---

## Core Modules

### 1. Server Configuration (`server.js`)

**Responsibilities:**

- Initialize Express app and HTTP server
- Configure middleware (CORS, JSON parsing, file upload)
- Connect to MongoDB
- Initialize Socket.IO server
- Register route handlers
- Register Socket.IO handlers

**Key Code:**

```javascript
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

chatHandler(io);
locationHandler(io);
```

**Port:** `process.env.PORT || 5001`

---

### 2. Models

#### User Model (`models/User.js`)

**Key Fields:**

- Authentication: `email`, `password`, `phoneNumber`, `googleId`, `appleId`
- Profile: `displayName`, `age`, `gender`, `bio`, `photos`, etc.
- Location: `lastLocation` (GeoJSON Point), `connectNowEnabled`
- **Push Notifications:**
  - `pushTokens`: Array of `{ token, deviceId, createdAt, lastUsed }`
  - `pushNotificationsEnabled`: Boolean (default: true)
  - `notificationPreferences`: Object with `messages`, `nearbyUsers`, `matches` booleans

**Indexes:**

- Geospatial index on `lastLocation` (2dsphere, sparse)
- Index on `pushTokens.token` (sparse)

**Methods:**

- `addPushToken(token, deviceId)`: Add or update push token
- `removePushToken(token)`: Remove a push token
- `hasValidPushToken()`: Check if user has valid tokens
- `getPushTokens()`: Get array of token strings

#### Match Model (`models/Match.js`)

Represents a match between two users with status (pending, active, blocked).

#### Message Model (`models/Message.js`)

Stores chat messages with content, type (text, image, audio, file), sender, receiver, and conversation ID.

#### Interaction Model (`models/Interaction.js`)

Tracks user swipe actions (like, pass, superlike) for recommendation engine.

---

### 3. Controllers

#### User Controller (`controllers/userController.js`)

**Endpoints:**

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/onboarding` - Save onboarding progress
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/matches` - Get potential matches
- **`POST /api/users/push-token`** - Register push notification token

**Push Token Registration:**

```javascript
exports.registerPushToken = async (req, res) => {
  const { token, deviceId } = req.body;

  // Validate token format
  if (!pushNotificationService.validateToken(token)) {
    return res.status(400).json({ message: "Invalid push token format" });
  }

  const user = await User.findById(req.user._id);
  await user.addPushToken(token, deviceId);

  res.json({
    message: "Push token registered successfully",
    tokenCount: user.pushTokens.length,
  });
};
```

#### Location Controller (`controllers/locationController.js`)

**Endpoints:**

- `POST /api/location/update` - Update user location
- `GET /api/location/nearby` - Get nearby users
- `POST /api/location/quick-hello` - Send Quick Hello (creates/activates match)

**Push Notification Integration:**

- Sends match notification when Quick Hello creates/activates a match

#### Chat Controller (`controllers/chatController.js`)

Handles REST API endpoints for chat operations (message history, conversation list).

---

### 4. Services

#### Push Notification Service (`services/pushNotificationService.js`)

**Class: `PushNotificationService`** (Singleton)

**Dependencies:**

- `expo-server-sdk`: Expo Push Notification client
- Optional: `EXPO_ACCESS_TOKEN` environment variable (for higher rate limits)

**Methods:**

1. **`validateToken(token)`**

   - Validates Expo push token format
   - Uses `Expo.isExpoPushToken(token)`

2. **`getUserPushTokens(userId)`**

   - Retrieves valid push tokens for a user
   - Checks `pushNotificationsEnabled` flag
   - Filters invalid tokens

3. **`sendNotification(userId, notification)`**

   - Main method for sending notifications
   - Checks global enable flag (`NOTIFICATION_ENABLED`)
   - Checks user preferences (`pushNotificationsEnabled` and `notificationPreferences`)
   - Validates notification type preferences
   - Retrieves user tokens and sends via `sendBatchNotifications`

4. **`sendBatchNotifications(notifications)`**

   - Sends multiple notifications (chunks of 100 - Expo limit)
   - Handles receipt checking for delivery status
   - Filters invalid tokens before sending

5. **`handleErrors(receipts)`**
   - Processes receipt errors (DeviceNotRegistered, InvalidCredentials, etc.)
   - Logs errors for monitoring

**Error Handling:**

- Returns result objects with `success` boolean and `reason`/`error`
- Reasons: `disabled`, `user_not_found`, `disabled_by_user`, `no_tokens`, `preference_disabled`

#### Notification Factory (`services/notifications/notificationFactory.js`)

**Class: `NotificationFactory`** (Static methods)

Creates standardized notification payloads for different types:

1. **`createMessageNotification(sender, messagePreview, conversationId)`**

   ```javascript
   {
     sound: 'default',
     title: sender.displayName,
     body: messagePreview,
     data: {
       type: 'message',
       conversationId,
       senderId,
       senderName
     },
     badge: 1
   }
   ```

2. **`createNearbyUserNotification(user, distance)`**

   ```javascript
   {
     sound: 'default',
     title: 'New User Nearby',
     body: `${user.displayName} is ${distance}m away`,
     data: {
       type: 'nearby_user',
       userId,
       userName,
       distance
     }
   }
   ```

3. **`createMatchNotification(user, matchId, message)`**
   ```javascript
   {
     sound: 'default',
     title: 'New Match! 💫',
     body: `${user.displayName}: ${message}`,
     data: {
       type: 'match',
       matchId,
       userId,
       userName,
       message
     },
     badge: 1
   }
   ```

#### Notification Types (`services/notifications/notificationTypes.js`)

Constants:

- `MESSAGE: 'message'`
- `NEARBY_USER: 'nearby_user'`
- `MATCH: 'match'`

---

### 5. Socket.IO Handlers

#### Chat Handler (`socket/chatHandler.js`)

**Events:**

- `send_message`: Handle incoming chat messages

**Push Notification Integration:**

- Checks if receiver is in the chat room (`io.in(roomId).fetchSockets()`)
- If receiver is NOT in room, sends push notification
- Uses `NotificationFactory.createMessageNotification()`
- Sends via `pushNotificationService.sendNotification()`

**Code Flow:**

```javascript
// Check if receiver is actively viewing chat
const roomId = getConversationId(senderId, receiverId);
const socketsInRoom = await io.in(roomId).fetchSockets();

if (socketsInRoom.length === 0) {
  // Receiver not in room - send push notification
  const notification = NotificationFactory.createMessageNotification(...);
  await pushNotificationService.sendNotification(receiverId, notification);
}
```

#### Location Handler (`socket/locationHandler.js`)

**Events:**

- `update_location`: Handle location updates

**Push Notification Integration:**

- When user location is updated and nearby users are detected
- Checks if user is actively viewing Connect Now screen
- If NOT viewing, sends nearby user notification
- Uses `NotificationFactory.createNearbyUserNotification()`

**Code Flow:**

```javascript
// Check proximity matches
const nearbyUsers = await User.find({
  connectNowEnabled: true,
  'lastLocation': { $near: { ... } }
});

// For each nearby user, send notification if user not actively viewing
if (!isUserInConnectNow) {
  const notification = NotificationFactory.createNearbyUserNotification(...);
  await pushNotificationService.sendNotification(userId, notification);
}
```

---

## Push Notification Feature Implementation

### Complete Flow Diagram

```
1. User logs in (Frontend)
   ↓
2. Frontend requests notification permissions
   ↓
3. Frontend gets Expo push token
   ↓
4. Frontend sends token to: POST /api/users/push-token
   ↓
5. Backend validates token format
   ↓
6. Backend saves token to User.pushTokens array
   ↓
7. Event occurs (message, match, nearby user)
   ↓
8. Controller/Handler checks if notification needed
   ↓
9. NotificationFactory creates payload
   ↓
10. PushNotificationService.sendNotification(userId, payload)
    ↓
11. Service checks global/user preferences
    ↓
12. Service retrieves user's push tokens
    ↓
13. Service sends to Expo API (sendBatchNotifications)
    ↓
14. Expo delivers to device
```

### Token Management Lifecycle

1. **Registration:**

   - Frontend obtains Expo push token
   - Sends to `/api/users/push-token` with optional `deviceId`
   - Backend validates and stores in `User.pushTokens` array
   - Supports multiple devices per user

2. **Validation:**

   - Token format validated using `Expo.isExpoPushToken()`
   - Tokens stored with `createdAt` and `lastUsed` timestamps

3. **Usage:**

   - Tokens retrieved when sending notifications
   - Invalid tokens filtered out automatically
   - Multiple tokens per user supported (multi-device)

4. **Error Handling:**
   - Receipt checking for delivery status
   - Invalid tokens detected via `DeviceNotRegistered` error
   - Tokens should be removed when invalid (manual cleanup needed)

### Notification Types and Triggers

#### 1. Message Notifications

- **Trigger:** New chat message received
- **When:** Receiver is NOT actively in chat room
- **Location:** `socket/chatHandler.js` → `send_message` event
- **Payload:** Sender name, message preview, conversation ID

#### 2. Match Notifications

- **Trigger:** New match created or existing match activated via Quick Hello
- **When:** User sends Quick Hello and match is created/activated
- **Location:** `controllers/locationController.js` → `sendQuickHello`
- **Payload:** Matched user name, match ID, optional message

#### 3. Nearby User Notifications

- **Trigger:** New user enters proximity (within 1km)
- **When:** Location update detects nearby user with Connect Now enabled
- **Condition:** Current user NOT actively viewing Connect Now screen
- **Location:** `socket/locationHandler.js` → `update_location` event
- **Payload:** Nearby user name, distance

### Permission Handling

**User Preferences:**

- Global toggle: `User.pushNotificationsEnabled` (default: true)
- Type-specific: `User.notificationPreferences.messages`, `nearbyUsers`, `matches` (default: true)
- Global flag: `process.env.NOTIFICATION_ENABLED` (optional, defaults to enabled)

**Flow:**

```javascript
// In PushNotificationService.sendNotification()
1. Check NOTIFICATION_ENABLED env var
2. Check user.pushNotificationsEnabled
3. Check user.notificationPreferences[type]
4. If all pass, send notification
```

### Error Handling and Edge Cases

1. **No Tokens:**

   - Returns `{ success: false, reason: 'no_tokens' }`
   - Logs warning but doesn't throw error

2. **Invalid Token Format:**

   - Validated before storing (`validateToken()`)
   - Invalid tokens filtered before sending

3. **User Not Found:**

   - Returns `{ success: false, reason: 'user_not_found' }`

4. **Notification Disabled:**

   - Global: Returns `{ success: false, reason: 'disabled' }`
   - User: Returns `{ success: false, reason: 'disabled_by_user' }`
   - Preference: Returns `{ success: false, reason: 'preference_disabled' }`

5. **Expo API Errors:**

   - Handled in `sendBatchNotifications()`
   - Receipt errors logged via `handleErrors()`
   - Common errors: `DeviceNotRegistered`, `InvalidCredentials`, `MessageTooBig`

6. **User in Active Room:**
   - Chat: No notification if user is in chat room
   - Connect Now: No notification if user is viewing Connect Now screen

---

## Database Schema

### User Model Schema

```javascript
{
  // Authentication
  email: String (required, unique)
  password: String (hashed)
  phoneNumber: String (unique, sparse)
  googleId: String
  appleId: String

  // Profile
  displayName: String
  age: Number
  birthDate: Date
  gender: Enum ['Male', 'Female', 'Non-binary', 'Prefer not to say']
  bio: String
  photos: [String]  // URLs

  // Location
  lastLocation: {
    type: 'Point',
    coordinates: [Number, Number],  // [longitude, latitude]
    timestamp: Date
  }
  connectNowEnabled: Boolean (default: false)

  // Push Notifications
  pushTokens: [{
    token: String (required),
    deviceId: String,
    createdAt: Date,
    lastUsed: Date
  }]
  pushNotificationsEnabled: Boolean (default: true)
  notificationPreferences: {
    messages: Boolean (default: true),
    nearbyUsers: Boolean (default: true),
    matches: Boolean (default: true)
  }

  // Status
  onboardingCompleted: Boolean (default: false)
  isPremium: Boolean (default: false)
  isVerified: Boolean (default: false)
  lastActive: Date

  // Timestamps
  createdAt: Date
  updatedAt: Date
}
```

### Indexes

1. **Geospatial Index:** `lastLocation` (2dsphere, sparse)

   - Used for proximity queries (`$near`)
   - Only indexes documents with valid location

2. **Token Index:** `pushTokens.token` (sparse)
   - Optimizes token lookups

---

## API Documentation

### Push Notification Endpoints

#### POST /api/users/push-token

**Protected:** Yes (requires JWT authentication)

**Request:**

```json
{
  "token": "ExponentPushToken[...]",
  "deviceId": "optional-device-id"
}
```

**Response:**

```json
{
  "message": "Push token registered successfully",
  "tokenCount": 1
}
```

**Error Responses:**

- `400`: Invalid token format
- `401`: Unauthorized (missing/invalid JWT)
- `404`: User not found
- `500`: Server error

---

### Other Key Endpoints

#### POST /api/location/quick-hello

**Protected:** Yes

**Triggers:** Match notification when match is created/activated

#### Socket.IO Events

- `send_message`: May trigger message notification
- `update_location`: May trigger nearby user notification

---

## Configuration

### Environment Variables

```bash
# Server
PORT=5001

# Database
MONGODB_URI=mongodb://localhost:27017/sugar_dating_app

# Authentication
JWT_SECRET=your-secret-key

# Push Notifications (Optional)
EXPO_ACCESS_TOKEN=your-expo-access-token  # For higher rate limits
NOTIFICATION_ENABLED=true  # Global notification toggle (default: true if not set)

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=your-phone-number

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## Dependencies

### Core Dependencies

```json
{
  "express": "^4.18.2", // Web framework
  "mongoose": "^8.0.3", // MongoDB ODM
  "socket.io": "^4.8.1", // Real-time communication
  "expo-server-sdk": "^3.7.0", // Expo push notifications
  "jsonwebtoken": "^9.0.2", // JWT authentication
  "bcryptjs": "^2.4.3", // Password hashing
  "cors": "^2.8.5", // CORS middleware
  "dotenv": "^16.3.1", // Environment variables
  "express-fileupload": "^1.5.2", // File upload handling
  "multer": "^2.0.2", // Additional file upload
  "twilio": "^5.10.6", // SMS/OTP service
  "cloudinary": "^2.8.0", // Image hosting
  "axios": "^1.13.2", // HTTP client
  "bad-words": "^4.0.0" // Profanity filter
}
```

**Purpose of Each:**

- **express**: REST API framework
- **mongoose**: Database operations and schema definitions
- **socket.io**: Real-time bidirectional communication
- **expo-server-sdk**: Send push notifications via Expo service
- **jsonwebtoken**: Secure authentication tokens
- **bcryptjs**: Password security
- **cors**: Allow cross-origin requests
- **twilio**: Send SMS for OTP verification
- **cloudinary**: Store and serve user images
- **bad-words**: Filter inappropriate chat messages

---

## Integration Points

### With Frontend (React Native)

1. **REST API:**

   - Frontend makes HTTP requests to endpoints
   - JWT token in Authorization header for protected routes

2. **Push Token Registration:**

   - Frontend obtains Expo push token
   - Sends to `POST /api/users/push-token`
   - Backend stores token for later use

3. **Socket.IO:**
   - Frontend connects to Socket.IO server
   - Real-time chat and location updates
   - Push notifications triggered from socket events

### With Python Matching Engine

- Python service uses MongoDB (shared database)
- No direct API communication
- Both services read/write to same MongoDB collections
- Python service updates `elo_score` field in User documents

### With Expo Push Notification Service

- Backend sends notifications via Expo Server SDK
- Expo handles delivery to iOS/Android devices
- Receipt checking for delivery status
- Token validation before sending

---

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- MongoDB instance (local or cloud)
- Expo account (for push notifications)

### Installation

1. **Install Dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Environment Setup:**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database:**

   - Ensure MongoDB is running
   - Connection string in `MONGODB_URI`

4. **Start Server:**
   ```bash
   npm start        # Production
   npm run dev      # Development (with nodemon)
   ```

### Push Notification Setup

1. **Expo Access Token (Optional):**

   - Get from: https://expo.dev/accounts/[your-account]/settings/access-tokens
   - Add to `.env`: `EXPO_ACCESS_TOKEN=your-token`
   - Provides higher rate limits

2. **Project ID:**

   - Configured in frontend `app.json`
   - Backend doesn't need project ID (Expo SDK handles it)

3. **Testing:**
   - Use Expo push notification tool: https://expo.dev/notifications
   - Or test via API endpoints

---

## Deployment Considerations

### Production Checklist

1. **Environment Variables:**

   - Set all required env vars in production environment
   - Use secure secret management (AWS Secrets Manager, etc.)
   - Never commit `.env` files

2. **MongoDB:**

   - Use managed MongoDB service (MongoDB Atlas)
   - Enable connection string encryption
   - Configure backups

3. **Push Notifications:**

   - Configure APNs (iOS) credentials via EAS
   - Configure FCM (Android) credentials
   - Monitor notification delivery rates

4. **Security:**

   - Use strong `JWT_SECRET`
   - Enable HTTPS
   - Configure CORS for specific origins (not `*`)
   - Rate limiting for API endpoints

5. **Monitoring:**

   - Log notification send failures
   - Monitor Expo API rate limits
   - Track token registration rates
   - Monitor Socket.IO connection counts

6. **Error Handling:**
   - Implement retry logic for failed notifications
   - Clean up invalid tokens periodically
   - Alert on high failure rates

### Scaling Considerations

- **Socket.IO:** Use Redis adapter for multi-server deployments
- **Notifications:** Batch notifications to respect Expo rate limits (100/chunk)
- **Database:** Add indexes as needed, consider read replicas
- **Load Balancing:** Use sticky sessions for Socket.IO connections

---

## Troubleshooting Guide

### Common Issues

1. **"No valid push tokens for user"**

   - Check: User has registered push token via `/api/users/push-token`
   - Check: `pushNotificationsEnabled` is `true`
   - Check: Token format is valid (Expo format)
   - Solution: Frontend should register token after login

2. **Notifications not sending**

   - Check: `NOTIFICATION_ENABLED` env var is not `'false'`
   - Check: User preferences allow notification type
   - Check: Expo access token is valid (if using)
   - Check: Server logs for error messages

3. **Invalid token format error**

   - Check: Token starts with `ExponentPushToken[` or `ExpoPushToken[`
   - Solution: Ensure frontend uses correct Expo push token

4. **User receiving too many notifications**

   - Check: User is in active chat room (shouldn't get message notifications)
   - Check: User is viewing Connect Now (shouldn't get nearby user notifications)
   - Solution: Verify socket room checking logic

5. **Expo API rate limits**
   - Solution: Add `EXPO_ACCESS_TOKEN` for higher limits
   - Solution: Implement notification queuing/throttling

---

## Testing Considerations

### Unit Tests Needed

1. **PushNotificationService:**

   - Token validation
   - User preference checking
   - Batch notification sending
   - Error handling

2. **NotificationFactory:**

   - Payload creation for each type
   - Data structure validation

3. **User Model:**
   - Token management methods
   - Preference defaults

### Integration Tests Needed

1. **Push Token Registration:**

   - Valid token registration
   - Invalid token rejection
   - Multiple device tokens

2. **Notification Sending:**

   - Message notification flow
   - Match notification flow
   - Nearby user notification flow
   - Preference filtering

3. **Socket.IO Integration:**
   - Chat notification triggering
   - Location notification triggering
   - Room-based filtering

---

## Summary

The Node.js backend provides a robust push notification system integrated with:

- **User management**: Token storage and preferences
- **Real-time events**: Socket.IO triggers for notifications
- **REST API**: Token registration endpoint
- **Service layer**: Centralized notification sending logic
- **Error handling**: Comprehensive error handling and logging

The implementation follows best practices with:

- Separation of concerns (Service, Factory, Controller layers)
- User preference management (global and type-specific)
- Multi-device support
- Efficient batch sending
- Graceful error handling
