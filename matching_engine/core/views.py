from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import User, Interaction
from .services.recommendation import RecommendationEngine
from .services.elo import update_elo_ratings
from bson import ObjectId

class RecommendationView(APIView):
    def get(self, req):
        user_id = req.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Convert string ID to ObjectId if needed by djongo/pymongo
            # But djongo models usually handle string/ObjectId conversion automatically
            # Let's try passing the string directly first
            engine = RecommendationEngine()
            recommendations = engine.get_recommendations(user_id)
            
            # Fetch full user objects for the recommended IDs
            # In a real microservice, we might just return IDs, but for simplicity let's return data
            results = []
            for rec in recommendations:
                user = User.objects.get(pk=rec['id'])
                results.append({
                    '_id': str(user._id),
                    'displayName': user.displayName,
                    'age': user.age,
                    'photos': user.photos,
                    'match_score': round(rec['match_score'] * 100, 1) # Percentage
                })
                
            return Response(results)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InteractionView(APIView):
    def post(self, req):
        actor_id = req.data.get('actor_id')
        target_id = req.data.get('target_id')
        action = req.data.get('action') # LIKE, PASS, SUPERLIKE

        if not all([actor_id, target_id, action]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Record interaction
            actor = User.objects.get(pk=actor_id)
            target = User.objects.get(pk=target_id)
            
            Interaction.objects.create(
                actor=actor,
                target=target,
                action_type=action
            )

            # Update ELO if it's a LIKE or PASS
            if action == 'LIKE' or action == 'SUPERLIKE':
                # Actor "wins" against Target? No, usually Target "wins" (is desirable)
                # If Actor LIKES Target -> Target gains ELO (is desirable)
                new_winner_elo, new_loser_elo = update_elo_ratings(target_id, actor_id)
            elif action == 'PASS':
                # Actor PASSES Target -> Target loses ELO (is less desirable)
                new_winner_elo, new_loser_elo = update_elo_ratings(actor_id, target_id)
            
            return Response({'status': 'success', 'message': 'Interaction recorded'})
            
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
