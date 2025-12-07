# Face Verification Service

Python microservice for face verification using OpenCV and dlib (via face-recognition library).

## Setup

### Prerequisites

- Python 3.8+
- MongoDB instance (shared with Node.js backend)
- **CMake** (required for building dlib):
  - macOS: `brew install cmake`
  - Ubuntu/Debian: `sudo apt-get install cmake`
  - Windows: Install CMake from cmake.org
- System dependencies for dlib and OpenCV:
  - macOS: CMake is usually sufficient (dlib builds from source)
  - Ubuntu/Debian: `sudo apt-get install cmake libopenblas-dev liblapack-dev`
  - Windows: Install Visual Studio Build Tools

### Installation

1. **Create Virtual Environment:**
   ```bash
   cd verification_service
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

   **Note:** dlib installation may take several minutes. If it fails, you may need to:
   - Install system dependencies first
   - Use a pre-built wheel: `pip install dlib-binary` (unofficial)

3. **Install Face Recognition Models:**
   ```bash
   ./install_models.sh
   ```
   
   Or manually:
   ```bash
   pip install git+https://github.com/ageitgey/face_recognition_models
   ```
   
   **Note:** This installs the models from GitHub (required for face_recognition to work)

4. **Environment Setup:**
   Create a `.env` file:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/sugar_dating_app
   VERIFICATION_SERVICE_PORT=8001
   DEBUG=True
   FACE_VERIFICATION_THRESHOLD=0.8  # 80% confidence required
   FACE_VERIFICATION_DISTANCE_THRESHOLD=0.6  # Distance threshold for face-recognition
   ```

5. **Start Service:**
   ```bash
   python app.py
   ```

   Service will run on `http://localhost:8001`

### Testing

Test the service health endpoint:
```bash
curl http://localhost:8001/health
```

Test face verification (example):
```bash
curl -X POST http://localhost:8001/api/verify-face \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your_user_id",
    "selfieImageBase64": "base64_encoded_image"
  }'
```

## API Endpoints

### POST /api/verify-face

Verify user's selfie against profile photos.

**Request:**
```json
{
  "userId": "user_id_string",
  "selfieImageBase64": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "verified": true,
  "confidence": 85.5,
  "message": "Face verification successful",
  "faces_found_in_selfie": 1,
  "profile_photos_compared": 3,
  "best_match_confidence": 85.5,
  "threshold": 80
}
```

## Configuration

- `FACE_VERIFICATION_THRESHOLD`: Minimum confidence percentage (default: 0.8 = 80%)
- `FACE_VERIFICATION_DISTANCE_THRESHOLD`: Distance threshold for face-recognition library (default: 0.6)

## Troubleshooting

### dlib Installation Issues

If dlib fails to install:
1. Ensure CMake is installed
2. Install system dependencies
3. Try: `pip install dlib-binary` (unofficial pre-built wheel)

### Face Detection Issues

- Ensure images have clear, front-facing faces
- Good lighting is important
- Remove sunglasses, masks, or obstructions

### Performance

- First verification may be slower (model loading)
- Processing time: ~2-5 seconds per verification
- Consider caching for production

