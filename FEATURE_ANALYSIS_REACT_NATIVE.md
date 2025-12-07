# Feature Analysis: React Native Frontend (Expo)

## Executive Summary

The React Native frontend is built with Expo SDK and follows a component-based architecture with Context API for state management. It provides a comprehensive mobile application with real-time messaging, location tracking, and push notification support. The app uses React Navigation for navigation and Socket.IO client for real-time communication.

**Key Technologies:**
- React Native with Expo SDK
- React Navigation (Stack & Tab Navigators)
- React Context API (State Management)
- Expo Notifications (Push Notifications)
- Socket.IO Client (Real-time Communication)
- Axios (HTTP Client)

**Architecture Pattern:** Component-based with Context providers, Service layer for API/Notifications

---

## Project Structure

```
src/
├── components/               # Reusable UI components
│   ├── CallModal.js
│   ├── CustomAlert.js
│   ├── GlassCard.js
│   ├── GradientButton.js
│   ├── NearbyUserCard.js
│   ├── ProfileBottomSheet.js
│   ├── QuickHelloModal.js
│   ├── SwipeCard.js
│   └── ...
├── constants/
│   └── location.js          # Location-related constants
├── context/                 # React Context providers
│   ├── AuthContext.js       # Authentication state
│   ├── BadgeContext.js      # Badge counts (unread messages, likes)
│   ├── CallContext.js       # WebRTC call state
│   └── NotificationContext.js  # Push notification state & management
├── hooks/                   # Custom React hooks
│   ├── useCustomAlert.js
│   ├── useLocationTracking.js
│   └── useProximityMatching.js
├── navigation/              # Navigation configuration
│   ├── AuthNavigator.js     # Stack navigator (auth → main app)
│   └── TabNavigator.js      # Bottom tab navigator (main app)
├── screens/                 # Screen components
│   ├── auth/                # Authentication screens
│   │   ├── LoginScreen.js
│   │   ├── PhoneOTPScreen.js
│   │   └── AgeVerificationScreen.js
│   ├── chat/                # Chat-related screens
│   │   ├── ChatScreen.js
│   │   ├── ConversationsScreen.js
│   │   ├── components/      # Chat components
│   │   ├── hooks/          # Chat hooks
│   │   └── data/           # Sticker data
│   ├── ConnectNowScreen.js  # Nearby users discovery
│   ├── MainScreen.js        # Swipe/match screen
│   ├── MessagesScreen.js
│   ├── onboarding/          # Onboarding flow
│   ├── profile/             # Profile screens
│   ├── settings/            # Settings screens
│   │   └── SettingsScreen.js  # Notification settings
│   └── verification/        # KYC verification
├── services/
│   ├── api/                 # API service layer
│   │   ├── config.js        # Axios configuration
│   │   ├── auth.js
│   │   ├── chat.js
│   │   ├── user.js          # User API (includes push token registration)
│   │   └── ...
│   ├── notifications/       # Notification services
│   │   ├── notificationHandler.js    # Deep linking & navigation
│   │   ├── notificationTypes.js      # Type constants & validation
│   │   └── pushNotificationService.js  # Expo notification operations
│   ├── socket.js            # Socket.IO client
│   └── webrtc.js            # WebRTC call handling
├── theme/
│   └── theme.js             # App theme configuration
└── utils/
    ├── animations.js
    └── messageContent.js

App.js                        # Root component with providers
app.json                      # Expo configuration
eas.json                      # EAS Build configuration
package.json                  # Dependencies
```

---

## Architecture Overview

### Design Patterns

1. **Context API Pattern:**
   - Global state management via React Context
   - Providers wrap app at root level
   - Hooks for accessing context (`useAuth`, `useNotification`)

2. **Service Layer Pattern:**
   - API calls abstracted into service modules
   - Notification operations in dedicated service
   - Socket.IO connection management in service

3. **Component Composition:**
   - Reusable components in `components/`
   - Screen-specific components in screen folders
   - Custom hooks for shared logic

### Data Flow

```
User Action → Component → Context/Service → API Call → Backend
                                                    ↓
                                            Socket.IO Event
                                                    ↓
Push Notification Received → NotificationContext → Navigation/UI Update
```

### Component Hierarchy

```
App.js
├── AuthProvider
│   ├── BadgeProvider
│   │   ├── NotificationProvider
│   │   │   ├── CallProvider
│   │   │   │   └── AuthNavigator
│   │   │   │       ├── LoginScreen
│   │   │   │       ├── TabNavigator (when authenticated)
│   │   │   │       │   ├── MainScreen
│   │   │   │       │   ├── ConnectNowScreen
│   │   │   │       │   ├── MessagesScreen
│   │   │   │       │   └── UserProfileScreen → SettingsScreen
│   │   │   │       └── ChatScreen (modal)
```

---

## Core Modules

### 1. Root Component (`App.js`)

**Responsibilities:**
- Initialize React Native app
- Wrap app with Context providers in correct order
- Provide navigation ref to NotificationContext for deep linking

**Structure:**
```javascript
<AuthProvider>
  <BadgeProvider>
    <NotificationProvider navigationRef={navigationRef}>
      <CallProvider>
        <AuthNavigator navigationRef={navigationRef} />
      </CallProvider>
    </NotificationProvider>
  </BadgeProvider>
</AuthProvider>
```

**Key Dependencies:**
- `@react-native-gesture-handler`: Must wrap app (GestureHandlerRootView)

---

### 2. Context Providers

#### NotificationContext (`context/NotificationContext.js`)

**State:**
- `expoPushToken`: String | null - Current Expo push token
- `permissionStatus`: 'undetermined' | 'granted' | 'denied' - Permission state
- `loading`: Boolean - Loading state for async operations

**Methods:**
- `initializeNotifications()`: Initialize push notifications after login
- `requestPermissions()`: Request notification permissions with user-friendly prompt
- `retryRequestPermissions()`: Retry permission request
- `checkPermissionStatus()`: Check current permission status
- `syncTokenWithBackend(token)`: Send token to backend API
- `refreshToken()`: Refresh push token

**Features:**
- User-friendly Alert prompt before system permission dialog
- Automatic token registration on login
- Permission status checking when app comes to foreground
- Deep linking support via `navigationRef`
- Notification listeners (received & tapped)

**Lifecycle:**
```javascript
1. User logs in → AuthContext updates
2. NotificationContext detects user change
3. Checks permission status
4. Shows user-friendly alert if needed
5. Requests system permissions
6. Gets Expo push token
7. Sends token to backend via API
8. Sets up notification listeners
```

#### AuthContext (`context/AuthContext.js`)

Manages user authentication state, login/logout, and user profile data.

#### BadgeContext (`context/BadgeContext.js`)

Manages unread message counts and likes count for tab badges.

#### CallContext (`context/CallContext.js`)

Manages WebRTC call state and signaling.

---

### 3. Services

#### Push Notification Service (`services/notifications/pushNotificationService.js`)

**Exports:**
- `requestPermissions()`: Request notification permissions
- `getPermissionStatus()`: Get current permission status
- `registerForPushNotifications()`: Get Expo push token
- `validateToken()`: Validate token format
- `clearBadge()`: Clear app badge count
- `openSettings()`: Open device settings

**Key Implementation:**
```javascript
// Project ID retrieval (multiple fallbacks)
let projectId = 
  Constants.expoConfig?.extra?.eas?.projectId || 
  Constants.easConfig?.projectId ||
  Constants.expoConfig?.extra?.easProjectId ||
  Constants.expoConfig?.projectId;

// Token registration with fallback
if (projectId) {
  tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
} else {
  // Expo will infer project ID for development builds
  tokenData = await Notifications.getExpoPushTokenAsync();
}
```

**Features:**
- Supports both project ID and no project ID (development builds)
- Comprehensive error handling with retry logic
- Android channel configuration
- Platform-specific settings opening

#### Notification Handler (`services/notifications/notificationHandler.js`)

**Exports:**
- `handleNotificationTap(notification, navigation)`: Handle notification tap and navigate

**Navigation Routes:**
- **Message**: Navigate to Chat screen with conversation
- **Nearby User**: Navigate to ConnectNow screen
- **Match**: Navigate to Chat screen with matched user

**Implementation:**
```javascript
const handlers = {
  [NOTIFICATION_TYPES.MESSAGE]: (data, nav) => {
    nav.navigate('Messages', {
      screen: 'Chat',
      params: { user: { _id: data.senderId }, conversationId: data.conversationId }
    });
  },
  // ... other handlers
};
```

#### Notification Types (`services/notifications/notificationTypes.js`)

**Constants:**
- `NOTIFICATION_TYPES.MESSAGE`: 'message'
- `NOTIFICATION_TYPES.NEARBY_USER`: 'nearby_user'
- `NOTIFICATION_TYPES.MATCH`: 'match'

**Utilities:**
- `validateNotificationData()`: Validate notification payload structure
- `getNotificationHandlerKey()`: Get handler key for routing
- `NotificationSchemas`: Type schemas for validation

#### User API Service (`services/api/user.js`)

**Methods:**
- `getUserDocument()`: Get user profile
- `updateUserDocument()`: Update user profile
- `registerPushToken(token, deviceId)`: **Register push token with backend**

**Push Token Registration:**
```javascript
export const registerPushToken = async (token, deviceId = null) => {
  const response = await api.post('/users/push-token', { token, deviceId });
  return response.data;
};
```

#### API Config (`services/api/config.js`)

**Configuration:**
- Base URL: `http://192.168.1.7:5001/api` (development)
- Axios interceptor adds JWT token from AsyncStorage to all requests
- Token retrieved automatically for authenticated requests

---

### 4. Screens

#### Settings Screen (`screens/settings/SettingsScreen.js`)

**Features:**
- Toggle for push notifications
- Display current permission status
- Button to open device settings
- Retry permission request button
- Information about notification types

**State Management:**
- Uses `useNotification()` hook for notification state
- Syncs with device permission status
- Updates UI when returning from settings

**UI Elements:**
- Switch for enabling/disabling notifications
- Status indicator (Enabled/Disabled/Not Set)
- "Open Device Settings" button
- "Retry Permission Request" button
- Info boxes explaining notification types

#### Connect Now Screen (`screens/ConnectNowScreen.js`)

Displays nearby users and handles Quick Hello feature. Integrates with location tracking hook.

#### Chat Screen (`screens/chat/ChatScreen.js`)

Real-time chat interface. Receives messages via Socket.IO and displays them.

#### Main Screen (`screens/MainScreen.js`)

Swipe-based matching interface for discovering potential matches.

---

### 5. Navigation

#### AuthNavigator (`navigation/AuthNavigator.js`)

**Stack Navigator Structure:**
```
- LoginScreen (initial if not authenticated)
- PhoneOTPScreen
- AgeVerificationScreen
- OnboardingWizard
- TabNavigator (main app, if authenticated)
- ChatScreen (modal)
- ViewUserProfileScreen
```

**Features:**
- Conditional rendering based on auth state
- Loading screen with animations
- Passes `navigationRef` to NotificationContext for deep linking

#### TabNavigator (`navigation/TabNavigator.js`)

**Tab Structure:**
- **Discover**: MainScreen (swipe matching)
- **TopPicks**: TopPicksScreen
- **ConnectNow**: ConnectNowScreen
- **Messages**: MessagesScreen (with badge count)
- **Profile**: UserProfileScreen

**Hidden Screens:**
- SettingsScreen (accessible via Profile → Notifications)

**Features:**
- Badge counts on Messages tab (unread messages)
- Custom tab bar styling
- Tab icons with Ionicons

---

### 6. Hooks

#### useLocationTracking (`hooks/useLocationTracking.js`)

**Features:**
- Requests location permissions
- Tracks user location updates
- Sends location to backend
- Handles permission denied with retry options

#### useProximityMatching (`hooks/useProximityMatching.js`)

Handles proximity-based matching logic for Connect Now feature.

---

## Push Notification Feature Implementation

### Complete Flow Diagram

```
1. App Launch
   ↓
2. AuthContext checks login status
   ↓
3. If logged in → NotificationContext.initializeNotifications()
   ↓
4. Check permission status (getPermissionStatus)
   ↓
5. If not granted:
   - Show user-friendly Alert
   - User taps "Enable" → requestPermissions()
   - System permission dialog appears
   ↓
6. If granted:
   - registerForPushNotifications()
   - Get Expo push token
   - Validate token format
   ↓
7. syncTokenWithBackend(token)
   - Call registerPushToken(token) API
   - Backend stores token
   ↓
8. Set up notification listeners
   - addNotificationReceivedListener (foreground)
   - addNotificationResponseReceivedListener (tap handling)
   ↓
9. When notification received:
   - If foreground: Show notification (via handler)
   - If background: OS handles display
   - If tapped: handleNotificationTap() → Navigate to relevant screen
```

### Permission Management Flow

**Initial Request:**
```
1. User-friendly Alert shown first
   "Enable Notifications"
   "Stay connected! Get notified when you receive:
   • New messages
   • New matches
   • Nearby users"
   [Not Now] [Enable]

2. If user taps "Enable":
   - System permission dialog appears
   - User grants/denies

3. If denied:
   - Show Alert with "Open Settings" option
   - Status set to 'denied'

4. If granted:
   - Continue with token registration
```

**Permission Status Checking:**
- On app launch
- When app comes to foreground (AppState change)
- When Settings screen comes into focus
- After returning from device settings

**Status States:**
- `undetermined`: Permission not yet requested
- `granted`: Permission granted
- `denied`: Permission denied (can't ask again until settings opened)

### Token Registration Flow

**Steps:**
1. **Get Project ID:**
   ```javascript
   // Try multiple sources
   Constants.expoConfig?.extra?.eas?.projectId
   Constants.easConfig?.projectId
   Constants.expoConfig?.extra?.easProjectId
   ```

2. **Get Push Token:**
   ```javascript
   // Try with project ID first
   if (projectId) {
     tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
   } else {
     // Fallback: Expo infers project ID
     tokenData = await Notifications.getExpoPushTokenAsync();
   }
   ```

3. **Validate Token:**
   ```javascript
   // Token format: ExponentPushToken[...] or ExpoPushToken[...]
   validateToken(token) // Returns boolean
   ```

4. **Send to Backend:**
   ```javascript
   await registerPushToken(token, deviceId);
   // POST /api/users/push-token
   ```

### Notification Reception Flow

**Foreground (App Active):**
```javascript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // Show notification
    shouldPlaySound: true,    // Play sound
    shouldSetBadge: true,     // Update badge
  }),
});
```

**Background/Quit:**
- OS handles notification display
- User taps notification → App opens → `addNotificationResponseReceivedListener` fires

**Notification Tap Handling:**
```javascript
// In NotificationContext
responseListener.current = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    const notification = response.notification;
    if (navigationRef?.current) {
      handleNotificationTap(notification, navigationRef.current);
    }
  }
);
```

**Deep Linking Navigation:**
- Message: Navigate to Chat with conversation
- Match: Navigate to Chat with matched user
- Nearby User: Navigate to ConnectNow screen

### Settings Integration

**Settings Screen Features:**
- Toggle switch for notifications
- Real-time permission status display
- Open device settings button
- Retry permission request button
- Visual status indicators (green/yellow/red)

**State Sync:**
- Settings screen subscribes to NotificationContext
- Updates when permission status changes
- Checks status when screen comes into focus

---

## State Management Patterns

### Context API Usage

**Provider Hierarchy:**
```
App
├── AuthProvider (user authentication)
│   └── BadgeProvider (unread counts)
│       └── NotificationProvider (push notifications)
│           └── CallProvider (WebRTC)
```

**Context Access:**
```javascript
// In components
const { user } = useAuth();
const { expoPushToken, permissionStatus } = useNotification();
const { unreadMessagesCount } = useBadge();
```

### State Updates

**Notification Context State:**
- Updated via `setExpoPushToken()`, `setPermissionStatus()`, `setLoading()`
- Triggers re-renders in consuming components
- Persisted only in memory (not AsyncStorage)

**Auth Context State:**
- Persisted in AsyncStorage (`userToken`, `userData`)
- Retrieved on app launch

---

## Native Module Integrations

### Expo Notifications

**Package:** `expo-notifications@~0.28.16`

**Usage:**
- Permission requests
- Token registration
- Notification handlers
- Badge management
- Notification listeners

**Configuration (`app.json`):**
```json
{
  "plugins": [
    [
      "expo-notifications",
      {
        "icon": "./assets/icon.png",
        "color": "#FF6B9D",
        "sounds": ["./assets/notification.wav"],
        "mode": "production"
      }
    ]
  ]
}
```

### Expo Location

**Package:** `expo-location@~19.0.7`

**Usage:**
- Location permission requests
- Location tracking
- Background location (for Connect Now)

**Configuration (`app.json`):**
```json
{
  "plugins": [
    [
      "expo-location",
      {
        "locationAlwaysAndWhenInUsePermission": "...",
        "locationWhenInUsePermission": "..."
      }
    ]
  ]
}
```

### Expo Device

**Package:** `expo-device@~6.0.2`

**Usage:**
- Check if running on physical device (required for push notifications)
- Device information

**Note:** Patched for iOS simulator compatibility (`patches/expo-device+6.0.2.patch`)

### Expo Constants

**Package:** `expo-constants@~17.0.3`

**Usage:**
- Access to `expoConfig` for project ID
- App configuration values

---

## Configuration

### app.json

**Key Configuration:**
```json
{
  "expo": {
    "name": "Sugar Dating",
    "slug": "stafftraveller_mob",
    "extra": {
      "eas": {
        "projectId": "ef36a5a2-8725-4cb2-9b8d-c81e39c99770"
      }
    },
    "ios": {
      "bundleIdentifier": "com.vofox.standbytraveller-mob",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "...",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "...",
        "NSLocationAlwaysUsageDescription": "..."
      }
    },
    "android": {
      "package": "com.sugardating.app",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

**Push Notification Plugin:**
- Icon, color, sounds configuration
- Production mode

### eas.json

**EAS Build Configuration:**
```json
{
  "cli": {
    "version": ">= 5.2.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### iOS Configuration

**Info.plist (ios/SugarDating/Info.plist):**
- Location permission descriptions
- Notification permission description (`NSUserNotificationsUsageDescription`)

**Bundle Identifier:** `com.vofox.standbytraveller-mob`

**Xcode Project:**
- `PRODUCT_BUNDLE_IDENTIFIER` set to match `app.json`

---

## Dependencies

### Core Dependencies

```json
{
  "expo": "~54.0.0",                    // Expo SDK
  "react": "19.1.0",                    // React
  "react-native": "0.81.5",             // React Native
  
  // Navigation
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20",
  "@react-navigation/bottom-tabs": "^6.5.11",
  
  // Notifications
  "expo-notifications": "~0.28.16",     // Push notifications
  "expo-device": "~6.0.2",              // Device info
  "expo-constants": "~17.0.3",          // App constants
  
  // Location
  "expo-location": "~19.0.7",           // Location tracking
  
  // API & Network
  "axios": "^1.13.2",                   // HTTP client
  "socket.io-client": "^4.8.1",         // Real-time communication
  
  // Storage
  "@react-native-async-storage/async-storage": "2.2.0",
  
  // UI & Media
  "expo-camera": "~17.0.9",
  "expo-image-picker": "~17.0.8",
  "expo-av": "~16.0.7",
  "expo-linear-gradient": "^15.0.7",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  
  // WebRTC
  "react-native-webrtc": "^124.0.7"
}
```

**Purpose of Key Dependencies:**
- **expo-notifications**: Push notification functionality
- **expo-device**: Device detection (required for notifications)
- **expo-constants**: Access to project configuration (project ID)
- **axios**: HTTP requests to backend API
- **socket.io-client**: Real-time chat and location updates
- **@react-navigation**: Navigation framework
- **@react-native-async-storage**: Persistent storage for tokens

---

## Integration Points

### With Backend (Node.js)

1. **REST API:**
   - Base URL: `http://192.168.1.7:5001/api` (development)
   - JWT token in Authorization header (via Axios interceptor)
   - Push token registration: `POST /api/users/push-token`

2. **Socket.IO:**
   - Connects to Socket.IO server
   - Real-time chat messages
   - Location updates
   - Receives events that may trigger notifications

### With Expo Push Notification Service

- Token obtained from Expo
- Token sent to backend
- Backend sends notifications via Expo Server SDK
- Expo delivers to device

### With Device OS

- Permission requests via native dialogs
- Notification display handled by OS
- Settings integration (opening device settings)
- Badge count management

---

## Setup Instructions

### Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode (for iOS builds)
- Android: Android Studio (for Android builds)
- Expo account (for push notifications)

### Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure API Base URL:**
   ```javascript
   // src/services/api/config.js
   const BASE_URL = 'http://YOUR_BACKEND_IP:5001/api';
   ```

3. **Start Development Server:**
   ```bash
   npm start
   # or
   expo start
   ```

4. **Run on Device:**
   ```bash
   # iOS
   npm run ios
   # or scan QR code with Expo Go app
   
   # Android
   npm run android
   ```

### Push Notification Setup

1. **EAS Project ID:**
   - Already configured in `app.json`: `extra.eas.projectId`
   - Project ID: `ef36a5a2-8725-4cb2-9b8d-c81e39c99770`

2. **iOS APNs:**
   - Configure APNs credentials via EAS CLI
   - Link with Apple Developer account
   - See `LINK_APNS_CREDENTIALS.md` for details

3. **Android FCM:**
   - Configure FCM credentials via EAS CLI
   - Google Services file required (`google-services.json`)

4. **Testing:**
   - Use Expo push notification tool: https://expo.dev/notifications
   - Or test via backend API

### Development Build

For push notifications to work in development:
```bash
# Create development build
npx eas-cli build --profile development --platform ios

# Install on device
# Then run: npm start
```

---

## Platform-Specific Configurations

### iOS

**Info.plist Permissions:**
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSLocationAlwaysUsageDescription`
- `NSUserNotificationsUsageDescription` (for notifications)

**Bundle Identifier:**
- `com.vofox.standbytraveller-mob`

**Capabilities:**
- Push Notifications enabled
- Background Modes (Location updates, Background fetch)

### Android

**Permissions (AndroidManifest.xml):**
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION`

**Package Name:**
- `com.sugardating.app`

**Notification Channel:**
- Created in `pushNotificationService.js`
- Channel ID: `default`
- Importance: `MAX`
- Vibration pattern configured

---

## Troubleshooting Guide

### Common Issues

1. **"Project ID not found" Warning**
   - **Cause**: `projectId` not found in `Constants.expoConfig`
   - **Solution**: Check `app.json` has `extra.eas.projectId` set
   - **Workaround**: Expo will infer project ID for development builds

2. **"Must use physical device" Warning**
   - **Cause**: Running on simulator/emulator
   - **Solution**: Use physical device for push notifications
   - **Note**: Simulators don't support push notifications

3. **Permission Always Denied**
   - **Cause**: User denied permission, can't ask again
   - **Solution**: Guide user to device Settings to enable
   - **Implementation**: `openSettings()` function

4. **Token Not Registering with Backend**
   - **Check**: API base URL is correct
   - **Check**: User is authenticated (JWT token present)
   - **Check**: Backend endpoint is accessible
   - **Check**: Token format is valid

5. **Notifications Not Showing**
   - **Foreground**: Check `setNotificationHandler` configuration
   - **Background**: Check OS notification permissions
   - **Check**: Token is registered with backend
   - **Check**: Backend is sending notifications

6. **Deep Linking Not Working**
   - **Check**: `navigationRef` is passed to NotificationContext
   - **Check**: Navigation structure matches handler routes
   - **Check**: Notification data structure is correct

---

## Testing Considerations

### Unit Tests Needed

1. **NotificationContext:**
   - Permission request flow
   - Token registration
   - State updates
   - Listener setup/cleanup

2. **PushNotificationService:**
   - Token validation
   - Permission status checking
   - Settings opening
   - Project ID fallback logic

3. **NotificationHandler:**
   - Navigation routing for each type
   - Invalid data handling

### Integration Tests Needed

1. **End-to-End Notification Flow:**
   - Permission request → Token registration → Backend sync
   - Notification reception → Tap → Navigation

2. **Settings Screen:**
   - Permission status display
   - Toggle interactions
   - Settings app opening

3. **Background/Foreground Handling:**
   - Notification display in different app states
   - Deep linking from background notifications

---

## Summary

The React Native frontend provides a comprehensive push notification implementation with:

- **User-friendly permission flow**: Alert before system dialog
- **Automatic token management**: Registration on login, sync with backend
- **Deep linking**: Navigate to relevant screens on notification tap
- **Settings integration**: User control over notifications
- **Error handling**: Comprehensive error handling and retry logic
- **Multi-device support**: Multiple tokens per user
- **Platform-specific handling**: iOS and Android configurations

The implementation follows React Native and Expo best practices with:
- Context API for global state
- Service layer for API/notification operations
- Component composition for reusability
- Proper lifecycle management
- Error boundaries and fallbacks

