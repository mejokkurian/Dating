from database import users_collection

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
        from bson import ObjectId
        
        winner = users_collection.find_one({'_id': ObjectId(winner_id)})
        loser = users_collection.find_one({'_id': ObjectId(loser_id)})
        
        if not winner or not loser:
            return None, None
        
        winner_elo = winner.get('elo_score', 1200)
        loser_elo = loser.get('elo_score', 1200)
        
        expected_winner = calculate_expected_score(winner_elo, loser_elo)
        expected_loser = calculate_expected_score(loser_elo, winner_elo)
        
        # Update scores
        new_winner_elo = int(winner_elo + K_FACTOR * (1 - expected_winner))
        new_loser_elo = int(loser_elo + K_FACTOR * (0 - expected_loser))
        
        users_collection.update_one(
            {'_id': ObjectId(winner_id)},
            {'$set': {'elo_score': new_winner_elo}}
        )
        users_collection.update_one(
            {'_id': ObjectId(loser_id)},
            {'$set': {'elo_score': new_loser_elo}}
        )
        
        return new_winner_elo, new_loser_elo
    except Exception as e:
        print(f"ELO update error: {e}")
        return None, None
