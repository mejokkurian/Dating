import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/sugar_dating_app')
PORT = int(os.getenv('VERIFICATION_SERVICE_PORT', 8001))
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# Face verification settings
FACE_VERIFICATION_THRESHOLD = float(os.getenv('FACE_VERIFICATION_THRESHOLD', '0.8'))  # 80% confidence
FACE_VERIFICATION_DISTANCE_THRESHOLD = float(os.getenv('FACE_VERIFICATION_DISTANCE_THRESHOLD', '0.6'))  # Distance threshold for face-recognition

