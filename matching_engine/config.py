import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/sugar_dating_app')
PORT = int(os.getenv('PORT', 8000))
DEBUG = os.getenv('DEBUG', 'True') == 'True'
