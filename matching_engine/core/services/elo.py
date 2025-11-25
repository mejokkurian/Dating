from .models import User

K_FACTOR = 32

def calculate_expected_score(rating_a, rating_b):
    """
    Calculate expected score for player A against player B.
    """
    return 1 / (1 + 10 ** ((rating_b - rating_a) / 400))

def update_elo_ratings(winner_id, loser_id):
    """
    Update ELO ratings for a winner (Like) and loser (Pass/Target of Like).
    In dating apps:
    - If A likes B, it's a "win" for B (B is desirable).
    - If A passes B, it's a "loss" for B.
    """
    try:
        winner = User.objects.get(pk=winner_id)
        loser = User.objects.get(pk=loser_id)
        
        expected_winner = calculate_expected_score(winner.elo_score, loser.elo_score)
        expected_loser = calculate_expected_score(loser.elo_score, winner.elo_score)
        
        # Update scores
        # Winner (Liked User) gains points
        winner.elo_score = int(winner.elo_score + K_FACTOR * (1 - expected_winner))
        
        # Loser (Passed User) loses points
        loser.elo_score = int(loser.elo_score + K_FACTOR * (0 - expected_loser))
        
        winner.save()
        loser.save()
        
        return winner.elo_score, loser.elo_score
    except User.DoesNotExist:
        return None, None
