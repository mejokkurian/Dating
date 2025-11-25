import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from database import users_collection
from bson import ObjectId

class RecommendationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')

    def _prepare_data(self, users):
        """
        Convert MongoDB documents to DataFrame and preprocess features.
        """
        data = []
        for user in users:
            # Combine text features for content-based filtering
            interests = user.get('interests', [])
            interests_str = ' '.join(interests) if isinstance(interests, list) else ''
            
            text_features = f"{user.get('bio', '')} {user.get('occupation', '')} {user.get('education', '')} {interests_str}"
            
            data.append({
                'id': str(user['_id']),
                'text_features': text_features,
                'age': user.get('age', 0),
                'elo_score': user.get('elo_score', 1200),
                'location': user.get('location', '')
            })
        
        return pd.DataFrame(data)

    def get_recommendations(self, user_id, limit=20):
        """
        Generate recommendations for a specific user.
        """
        try:
            target_user = users_collection.find_one({'_id': ObjectId(user_id)})
            if not target_user:
                return []

            # Get all potential matches (exclude self)
            candidates = list(users_collection.find({
                '_id': {'$ne': ObjectId(user_id)},
                'onboardingCompleted': True
            }).limit(100))
            
            if not candidates:
                return []

            # Prepare data
            df = self._prepare_data(candidates + [target_user])
            
            if len(df) < 2:
                return []
            
            # 1. Content-Based Filtering (Text Similarity)
            try:
                tfidf_matrix = self.vectorizer.fit_transform(df['text_features'])
                
                # Calculate cosine similarity between target user (last row) and all others
                target_idx = len(df) - 1
                cosine_sim = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix[:-1]).flatten()
            except:
                # Fallback if TF-IDF fails
                cosine_sim = np.ones(len(df) - 1) * 0.5
            
            # 2. ELO Score Similarity
            target_elo = target_user.get('elo_score', 1200)
            elo_diff = np.abs(df['elo_score'][:-1] - target_elo)
            max_diff = elo_diff.max() if elo_diff.max() > 0 else 1
            elo_score = 1 - (elo_diff / (max_diff + 1))
            
            # 3. Combine Scores (Weighted Average)
            final_scores = (0.7 * cosine_sim) + (0.3 * elo_score)
            
            # Add scores to dataframe (excluding target user)
            results = df.iloc[:-1].copy()
            results['match_score'] = final_scores
            
            # Sort by score
            recommendations = results.sort_values('match_score', ascending=False).head(limit)
            
            return recommendations[['id', 'match_score']].to_dict('records')
        except Exception as e:
            print(f"Recommendation error: {e}")
            return []
