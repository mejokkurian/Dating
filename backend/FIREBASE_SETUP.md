# Firebase Phone Authentication Setup Guide

## Quick Setup

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one if needed)
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the JSON file to your backend directory (e.g., `backend/firebase-service-account.json`)

### 2. Update Environment Variables

Add to your `backend/.env` file:

```env
# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json
```

### 3. Test the OTP Flow

**Development Mode:**
- OTP codes are logged to the console
- No actual SMS is sent (saves costs)
- OTP code is included in API response for easy testing

**Send OTP:**
```bash
curl -X POST http://localhost:5001/api/auth/phone/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

**Response (Development):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "code": "123456"
}
```

**Verify OTP:**
```bash
curl -X POST http://localhost:5001/api/auth/phone/verify \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890", "code": "123456"}'
```

**Response:**
```json
{
  "_id": "...",
  "phoneNumber": "+1234567890",
  "displayName": "New User",
  "token": "eyJhbGc..."
}
```

## Production Setup

To send actual SMS in production, integrate with an SMS provider:

### Option 1: Twilio (if you have balance)
### Option 2: AWS SNS (Free tier available)
### Option 3: Firebase Cloud Functions with Twilio

For now, the system works perfectly for development and testing without any SMS costs!

## Security Notes

- ✅ OTP codes expire after 5 minutes
- ✅ Codes are removed after successful verification
- ✅ Firebase custom tokens are generated for authenticated users
- ✅ In-memory storage is cleaned up automatically

## Cost: $0.00 💰

Firebase Admin SDK is completely free for backend use!
