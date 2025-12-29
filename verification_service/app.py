"""
Face Verification Service API
Flask API for face verification using OpenCV and dlib
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from services.face_verification import verify_face
from config import PORT, DEBUG

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'face-verification-service'
    })


@app.route('/api/verify-face', methods=['POST'])
def verify_face_endpoint():
    """
    Verify user's face by comparing selfie with profile photos
    
    Request Body (JSON):
    {
        "userId": "user_id_string",
        "selfieImageBase64": "base64_encoded_image"
    }
    
    Response:
    {
        "verified": bool,
        "confidence": float (0-100),
        "message": str,
        "faces_found_in_selfie": int,
        "profile_photos_compared": int,
        "best_match_confidence": float
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            print("ERROR: No JSON data in request")
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'Invalid request body',
                'error': 'INVALID_REQUEST'
            }), 400
        
        user_id = data.get('userId')
        selfie_base64 = data.get('selfieImageBase64')
        
        print(f"Received verification request for userId: {user_id}")
        print(f"Image data present: {bool(selfie_base64)}")
        print(f"Image data length: {len(selfie_base64) if selfie_base64 else 0}")
        
        if not user_id:
            print("ERROR: Missing userId")
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'userId is required',
                'error': 'MISSING_USER_ID'
            }), 400
        
        if not selfie_base64:
            print("ERROR: Missing selfieImageBase64")
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'selfieImageBase64 is required',
                'error': 'MISSING_IMAGE'
            }), 400
        
        # Verify face
        print(f"Calling verify_face for user: {user_id}")
        result = verify_face(user_id, selfie_base64)
        
        print(f"Verification result: verified={result.get('verified')}, error={result.get('error')}, message={result.get('message')}")
        
        # Return appropriate status code
        # Most verification failures should return 200 with verified: false
        # Only return 400 for actual request errors (missing params, invalid format)
        # Server errors return 500
        error = result.get('error')
        
        # These are validation/user errors, should return 200
        validation_errors = [
            'NO_FACE_IN_SELFIE',
            'MULTIPLE_FACES_IN_SELFIE',
            'NO_FACES_IN_PROFILE_PHOTOS',
            'INVALID_IMAGE',
            'USER_NOT_FOUND',
            'NO_PROFILE_PHOTOS'
        ]
        
        if error and error not in validation_errors:
            # Actual server/verification errors
            if error == 'VERIFICATION_ERROR':
                status_code = 500
            else:
                status_code = 400
        else:
            # Validation failures or success - return 200
            status_code = 200
        
        return jsonify(result), status_code
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"EXCEPTION in verify_face_endpoint: {str(e)}")
        print(f"Traceback: {error_trace}")
        return jsonify({
            'verified': False,
            'confidence': 0,
            'message': f'Server error: {str(e)}',
            'error': 'SERVER_ERROR'
        }), 500


if __name__ == '__main__':
    print(f"Starting Face Verification Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG)

