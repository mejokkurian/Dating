"""
Face Verification Service
Uses OpenCV and dlib (via face-recognition library) for face comparison
"""
import face_recognition
import numpy as np
from PIL import Image
import io
import base64
from typing import List, Dict, Tuple, Optional
from database import users_collection
from config import FACE_VERIFICATION_THRESHOLD, FACE_VERIFICATION_DISTANCE_THRESHOLD
from bson import ObjectId


def decode_base64_image(base64_string: str) -> Image.Image:
    """
    Decode base64 string to PIL Image with preprocessing
    """
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[3])
            image = rgb_image
        elif image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if image is too large (face_recognition works better with reasonable sizes)
        # Very large images can cause issues, very small images lack detail
        max_dimension = 2000
        if image.width > max_dimension or image.height > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            print(f"Image resized to: {image.size}")
        
        # Ensure minimum size for face detection
        min_dimension = 200
        if image.width < min_dimension or image.height < min_dimension:
            scale = min_dimension / min(image.width, image.height)
            new_size = (int(image.width * scale), int(image.height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"Image upscaled to: {image.size}")
        
        return image
    except Exception as e:
        raise ValueError(f"Failed to decode image: {str(e)}")


def get_face_encodings(image: Image.Image, model: str = 'hog') -> List[np.ndarray]:
    """
    Detect faces and return face encodings from image
    
    Args:
        image: PIL Image
        model: Face detection model - 'hog' (faster, less accurate) or 'cnn' (slower, more accurate)
    
    Returns:
        List of face encodings (128-dimensional vectors)
    """
    try:
        # Convert PIL Image to numpy array
        image_array = np.array(image)
        print(f"Image shape: {image_array.shape}, dtype: {image_array.dtype}")
        
        # Find face locations - try both models if first fails
        face_locations = face_recognition.face_locations(image_array, model=model)
        print(f"Face locations found with {model} model: {len(face_locations)}")
        
        # If no faces found with default model and we used 'hog', try 'cnn'
        if len(face_locations) == 0 and model == 'hog':
            print("Trying CNN model (more accurate but slower)...")
            face_locations = face_recognition.face_locations(image_array, model='cnn')
            print(f"Face locations found with cnn model: {len(face_locations)}")
        
        if len(face_locations) == 0:
            print("WARNING: No faces detected in image")
            return []
        
        print(f"Face locations: {face_locations}")
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(image_array, face_locations, model='large')
        print(f"Face encodings generated: {len(face_encodings)}")
        
        return face_encodings
    except Exception as e:
        print(f"ERROR in get_face_encodings: {str(e)}")
        raise ValueError(f"Failed to get face encodings: {str(e)}")


def compare_faces(known_encoding: np.ndarray, unknown_encoding: np.ndarray, tolerance: float = None) -> Tuple[bool, float]:
    """
    Compare two face encodings and return match result with confidence
    
    Args:
        known_encoding: Face encoding from profile photo
        unknown_encoding: Face encoding from selfie
        tolerance: Distance threshold (default: FACE_VERIFICATION_DISTANCE_THRESHOLD)
    
    Returns:
        Tuple of (is_match: bool, confidence: float)
    """
    if tolerance is None:
        tolerance = FACE_VERIFICATION_DISTANCE_THRESHOLD
    
    # Calculate Euclidean distance
    distance = face_recognition.face_distance([known_encoding], unknown_encoding)[0]
    
    # Check if match (lower distance = more similar)
    is_match = distance <= tolerance
    
    # Convert distance to confidence percentage
    # distance of 0 = 100% confidence, distance of tolerance = 0% confidence
    confidence = max(0, min(100, (1 - (distance / tolerance)) * 100))
    
    return is_match, confidence


def verify_face(user_id: str, selfie_base64: str) -> Dict:
    """
    Verify user's selfie against their profile photos
    
    Args:
        user_id: User ID
        selfie_base64: Base64 encoded selfie image
    
    Returns:
        Dict with verification result:
        {
            'verified': bool,
            'confidence': float (0-100),
            'message': str,
            'faces_found_in_selfie': int,
            'profile_photos_compared': int,
            'best_match_confidence': float
        }
    """
    try:
        # Get user from database
        try:
            user_object_id = ObjectId(user_id)
        except Exception as e:
            print(f"ERROR: Invalid user_id format: {user_id}, error: {str(e)}")
            return {
                'verified': False,
                'confidence': 0,
                'message': f'Invalid user ID format: {str(e)}',
                'error': 'INVALID_USER_ID'
            }
        
        print(f"Looking up user with ObjectId: {user_object_id}")
        user = users_collection.find_one({'_id': user_object_id})
        
        if not user:
            print(f"ERROR: User not found with ID: {user_id}")
            return {
                'verified': False,
                'confidence': 0,
                'message': 'User not found',
                'error': 'USER_NOT_FOUND'
            }
        
        print(f"User found: {user.get('_id')}, has {len(user.get('photos', []))} photos")
        
        # Get user's profile photos
        profile_photos = user.get('photos', [])
        
        if not profile_photos or len(profile_photos) == 0:
            return {
                'verified': False,
                'confidence': 0,
                'message': 'No profile photos found. Please upload at least one profile photo first.',
                'error': 'NO_PROFILE_PHOTOS'
            }
        
        # Decode selfie image
        try:
            print("Decoding selfie image from base64...")
            selfie_image = decode_base64_image(selfie_base64)
            print(f"Selfie image decoded: size={selfie_image.size}, mode={selfie_image.mode}")
        except Exception as e:
            print(f"ERROR decoding selfie image: {str(e)}")
            return {
                'verified': False,
                'confidence': 0,
                'message': f'Invalid selfie image: {str(e)}',
                'error': 'INVALID_IMAGE'
            }
        
        # Get face encoding from selfie
        print("Detecting faces in selfie...")
        selfie_encodings = get_face_encodings(selfie_image)
        
        if len(selfie_encodings) == 0:
            print("ERROR: No faces detected in selfie image")
            return {
                'verified': False,
                'confidence': 0,
                'message': 'No face detected in selfie. Please ensure your face is clearly visible, well-lit, and facing the camera directly.',
                'error': 'NO_FACE_IN_SELFIE'
            }
        
        if len(selfie_encodings) > 1:
            return {
                'verified': False,
                'confidence': 0,
                'message': 'Multiple faces detected in selfie. Please take a selfie with only your face visible.',
                'error': 'MULTIPLE_FACES_IN_SELFIE'
            }
        
        selfie_encoding = selfie_encodings[0]
        
        # Compare with all profile photos
        best_confidence = 0
        best_match = False
        profile_photos_compared = 0
        all_confidences = []
        
        import requests
        
        for photo_url in profile_photos:
            try:
                # Download profile photo
                response = requests.get(photo_url, timeout=10)
                if response.status_code != 200:
                    continue
                
                # Decode image
                profile_image = Image.open(io.BytesIO(response.content))
                if profile_image.mode != 'RGB':
                    profile_image = profile_image.convert('RGB')
                
                # Get face encodings from profile photo
                profile_encodings = get_face_encodings(profile_image)
                
                if len(profile_encodings) == 0:
                    continue  # Skip photos without faces
                
                profile_photos_compared += 1
                
                # Compare with selfie (use best match from profile photo)
                for profile_encoding in profile_encodings:
                    is_match, confidence = compare_faces(profile_encoding, selfie_encoding)
                    all_confidences.append(confidence)
                    
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_match = is_match
                
            except Exception as e:
                print(f"Error processing profile photo {photo_url}: {str(e)}")
                continue
        
        if profile_photos_compared == 0:
            return {
                'verified': False,
                'confidence': 0,
                'message': 'No faces found in profile photos. Please upload photos with your face clearly visible.',
                'error': 'NO_FACES_IN_PROFILE_PHOTOS'
            }
        
        # Determine verification result
        verified = best_match and best_confidence >= (FACE_VERIFICATION_THRESHOLD * 100)
        
        # Calculate average confidence
        avg_confidence = np.mean(all_confidences) if all_confidences else 0
        
        # Use best confidence for final result
        final_confidence = best_confidence
        
        message = 'Face verification successful' if verified else f'Face verification failed. Confidence: {final_confidence:.1f}%. Minimum required: {FACE_VERIFICATION_THRESHOLD * 100:.0f}%'
        
        return {
            'verified': verified,
            'confidence': round(final_confidence, 2),
            'average_confidence': round(avg_confidence, 2),
            'message': message,
            'faces_found_in_selfie': len(selfie_encodings),
            'profile_photos_compared': profile_photos_compared,
            'best_match_confidence': round(best_confidence, 2),
            'threshold': FACE_VERIFICATION_THRESHOLD * 100
        }
        
    except Exception as e:
        return {
            'verified': False,
            'confidence': 0,
            'message': f'Verification error: {str(e)}',
            'error': 'VERIFICATION_ERROR'
        }

