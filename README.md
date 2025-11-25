# Dating App

A modern dating application built with React Native (Expo), Node.js, and Python/Flask.

## Features

- 📱 Phone number authentication with Twilio OTP
- 🔐 JWT-based authentication
- 💬 Real-time chat with Socket.IO
- 🤖 AI-powered matching engine with ELO ratings
- 📸 Image uploads with Cloudinary
- 👤 User profiles and onboarding
- 💖 Swipe-based matching system

## Tech Stack

### Frontend
- React Native (Expo)
- Socket.IO Client
- Axios
- AsyncStorage

### Backend (Node.js)
- Express.js
- MongoDB with Mongoose
- Socket.IO
- JWT Authentication
- Twilio (SMS OTP)
- Cloudinary (Image uploads)

### Matching Engine (Python)
- Flask
- PyMongo
- Scikit-learn (ML)
- Pandas & NumPy

## Setup

### Prerequisites
- Node.js 16+
- Python 3.8+
- MongoDB
- Expo CLI

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/mejokkurian/Dating.git
cd Dating
```

2. **Install dependencies**
```bash
# Frontend
npm install

# Backend
cd backend
npm install

# Matching Engine
cd ../matching_engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configure environment variables**

Create `backend/.env`:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/sugar_dating_app
JWT_SECRET=your_jwt_secret_here

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_SERVICE_SID=your_service_sid
```

Create `matching_engine/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/sugar_dating_app
PORT=8000
DEBUG=True
```

4. **Update Socket.IO URL**

Edit `src/services/socket.js` and update the `SOCKET_URL` with your backend IP address.

### Running the Application

1. **Start MongoDB**
```bash
mongod
```

2. **Start Backend**
```bash
cd backend
npm start
```

3. **Start Matching Engine**
```bash
cd matching_engine
source venv/bin/activate
python app.py
```

4. **Start Frontend**
```bash
npx expo start
```

## Project Structure

```
mobile-app/
├── src/                    # React Native app
│   ├── components/         # Reusable components
│   ├── screens/           # App screens
│   ├── services/          # API & Socket services
│   ├── context/           # React Context
│   └── navigation/        # Navigation setup
├── backend/               # Node.js API
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── socket/           # Socket.IO handlers
│   └── middleware/       # Auth middleware
└── matching_engine/      # Python ML service
    ├── services/         # ELO & Recommendation
    └── app.py           # Flask server
```

## License

MIT
