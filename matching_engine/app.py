from flask import Flask, request, jsonify
from services.recommendation import RecommendationEngine
from services.elo import update_elo_ratings
from database import users_collection, interactions_collection
from bson import ObjectId
from datetime import datetime
import config

app = Flask(__name__)
engine = RecommendationEngine()

@app.route('/api/recommendations/', methods=['GET'])
def get_recommendations():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'user_id is required'}), 400

        recommendations = engine.get_recommendations(user_id)
        
        # Fetch full user objects for the recommended IDs
        results = []
        for rec in recommendations:
            user = users_collection.find_one({'_id': ObjectId(rec['id'])})
            if user:
                results.append({
                    '_id': str(user['_id']),
                    'displayName': user.get('displayName'),
                    'age': user.get('age'),
                    'photos': user.get('photos', []),
                    'match_score': round(rec['match_score'] * 100, 1)
                })
                
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/interaction/', methods=['POST'])
def record_interaction():
    try:
        data = request.json
        actor_id = data.get('actor_id')
        target_id = data.get('target_id')
        action = data.get('action')  # LIKE, PASS, SUPERLIKE

        if not all([actor_id, target_id, action]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Record interaction
        interactions_collection.insert_one({
            'actor_id': ObjectId(actor_id),
            'target_id': ObjectId(target_id),
            'action_type': action,
            'timestamp': datetime.utcnow()
        })

        # Update ELO if it's a LIKE or PASS
        if action in ['LIKE', 'SUPERLIKE']:
            # Target gains ELO (is desirable)
            update_elo_ratings(target_id, actor_id)
        elif action == 'PASS':
            # Target loses ELO (is less desirable)
            update_elo_ratings(actor_id, target_id)
        
        return jsonify({'status': 'success', 'message': 'Interaction recorded'})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'matching-engine'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=config.PORT, debug=config.DEBUG)
