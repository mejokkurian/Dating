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
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'Invalid request body',
                'error': 'INVALID_REQUEST'
            }), 400
        
        user_id = data.get('userId')
        selfie_base64 = data.get('selfieImageBase64')
        
        if not user_id:
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'userId is required',
                'error': 'MISSING_USER_ID'
            }), 400
        
        if not selfie_base64:
            return jsonify({
                'verified': False,
                'confidence': 0,
                'message': 'selfieImageBase64 is required',
                'error': 'MISSING_IMAGE'
            }), 400
        
        # Verify face
        result = verify_face(user_id, selfie_base64)
        
        # Return appropriate status code
        status_code = 200 if result.get('verified') or not result.get('error') else 400
        
        return jsonify(result), status_code
        
    except Exception as e:
        return jsonify({
            'verified': False,
            'confidence': 0,
            'message': f'Server error: {str(e)}',
            'error': 'SERVER_ERROR'
        }), 500


if __name__ == '__main__':
    print(f"Starting Face Verification Service on port {PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=DEBUG)

