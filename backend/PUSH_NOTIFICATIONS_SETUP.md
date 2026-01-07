# Push Notifications Setup Guide

## EXPO_ACCESS_TOKEN (Optional)

The `EXPO_ACCESS_TOKEN` is **OPTIONAL**. Push notifications will work perfectly fine without it!

### Why Use It?
- **Higher rate limits**: With a token, you get higher rate limits (useful for production)
- **Better reliability**: More stable service for high-volume apps
- **Production-ready**: Recommended for apps with many users

### Without Token (Default)
- Works perfectly for development and testing
- Lower rate limits (still sufficient for most apps)
- No additional setup required

## How to Get EXPO_ACCESS_TOKEN (If Needed)

### Step 1: Create Expo Account
1. Go to https://expo.dev/
2. Sign up or log in to your account

### Step 2: Get Access Token
1. Go to your account settings: https://expo.dev/accounts/[your-account-name]/settings/access-tokens
2. Click "Create Token"
3. Give it a name (e.g., "Push Notifications")
4. Copy the token (you'll only see it once!)

### Step 3: Add to Backend .env File
1. Create a `.env` file in the `backend/` directory (if it doesn't exist)
2. Add the following line:

```env
EXPO_ACCESS_TOKEN=your-token-here
```

3. Restart your backend server

## Environment Variables

### Required Variables
```env
MONGODB_URI=mongodb://localhost:27017/sugar_dating_app
JWT_SECRET=your-secret-key
PORT=5001
```

### Optional Variables
```env
# Expo Push Notification Access Token (for higher rate limits)
EXPO_ACCESS_TOKEN=your-token-here

# Enable/Disable notifications globally (default: enabled)
NOTIFICATION_ENABLED=true
```

## Testing Without Token

You can test push notifications immediately without any token! Just:
1. Make sure your backend server is running
2. Ensure users have push notification permissions enabled in the app
3. Send a message or create a match - notifications will work!

## Important Notes

- **Development**: Token is NOT required - works out of the box
- **Production**: Token is recommended for better performance and reliability
- **Rate Limits**: Without token: ~100 requests/second. With token: Much higher limits
- **Security**: Never commit your `.env` file or access token to git!

