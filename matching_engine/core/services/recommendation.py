import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from ..models import User

class RecommendationEngine:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.scaler = MinMaxScaler()

    def _prepare_data(self, users):
        """
        Convert Django QuerySet to DataFrame and preprocess features.
        """
        data = []
        for user in users:
            # Combine text features for content-based filtering
            text_features = f"{user.bio or ''} {user.occupation or ''} {user.education or ''} {' '.join(user.interests or [])}"
            
            data.append({
                'id': user._id,
                'text_features': text_features,
                'age': user.age or 0,
                'elo_score': user.elo_score,
                'location': user.location
            })
        
        return pd.DataFrame(data)

    def get_recommendations(self, user_id, limit=20):
        """
        Generate recommendations for a specific user.
        """
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return []

        # Get all potential matches (exclude self)
        # In production, filter by gender preference here first
        candidates = User.objects.exclude(pk=user_id)
        
        if not candidates.exists():
            return []

        # Prepare data
        df = self._prepare_data(list(candidates) + [target_user])
        
        # 1. Content-Based Filtering (Text Similarity)
        tfidf_matrix = self.vectorizer.fit_transform(df['text_features'])
        
        # Calculate cosine similarity between target user (last row) and all others
        target_idx = len(df) - 1
        cosine_sim = cosine_similarity(tfidf_matrix[target_idx:target_idx+1], tfidf_matrix[:-1]).flatten()
        
        # 2. ELO Score Similarity (Collaborative-ish)
        # Users with similar ELO scores are more likely to match
        target_elo = target_user.elo_score
        elo_diff = np.abs(df['elo_score'][:-1] - target_elo)
        # Normalize ELO diff (lower diff is better, so invert)
        elo_score = 1 - (elo_diff / (elo_diff.max() + 1)) # Simple normalization
        
        # 3. Combine Scores (Weighted Average)
        # Weights: 70% Content (Interests/Bio), 30% ELO (Desirability)
        final_scores = (0.7 * cosine_sim) + (0.3 * elo_score)
        
        # Add scores to dataframe (excluding target user)
        results = df.iloc[:-1].copy()
        results['match_score'] = final_scores
        
        # Sort by score
        recommendations = results.sort_values('match_score', ascending=False).head(limit)
        
        return recommendations[['id', 'match_score']].to_dict('records')
