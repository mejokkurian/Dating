# Feature Analysis: Python Matching Engine

## Executive Summary

The Python matching engine is a hybrid Django/Flask microservice that provides recommendation and ELO rating functionality for the dating app. It uses Django models (via Djongo) to interact with the shared MongoDB database and Flask for a lightweight REST API. The service implements content-based filtering using TF-IDF and an ELO rating system to provide match recommendations.

**Key Technologies:**
- Flask (REST API)
- Django (Models via Djongo)
- MongoDB (via PyMongo and Djongo)
- scikit-learn (Machine Learning - TF-IDF)
- pandas & numpy (Data Processing)

**Architecture Pattern:** Hybrid Django/Flask microservice with shared MongoDB database

**Note:** This service does NOT handle push notifications. Push notifications are handled by the Node.js backend.

---

## Project Structure

```
matching_engine/
├── app.py                    # Flask application entry point
├── config.py                 # Configuration (MongoDB URI, PORT, DEBUG)
├── database.py               # MongoDB connection (PyMongo)
├── manage.py                 # Django management commands
├── requirements.txt          # Python dependencies
├── core/                     # Django app
│   ├── __init__.py
│   ├── admin.py              # Django admin configuration
│   ├── apps.py               # Django app configuration
│   ├── models.py             # Django models (Djongo)
│   ├── urls.py               # Django URL patterns
│   ├── views.py              # Django REST Framework views
│   ├── tests.py              # Django tests
│   └── services/             # Business logic services
│       ├── recommendation.py # RecommendationEngine (Django version)
│       └── elo.py            # ELO rating system (Django version)
├── services/                 # Standalone services (Flask)
│   ├── recommendation.py     # RecommendationEngine (Flask version)
│   └── elo.py                # ELO rating system (Flask version)
└── venv/                     # Python virtual environment
```

---

## Architecture Overview

### Design Patterns

1. **Hybrid Architecture:**
   - **Django**: Models and ORM (via Djongo for MongoDB)
   - **Flask**: Lightweight REST API
   - **PyMongo**: Direct MongoDB access when needed

2. **Service Layer Pattern:**
   - Business logic separated into service classes
   - `RecommendationEngine`: Content-based filtering algorithm
   - `update_elo_ratings`: ELO rating calculation

3. **Microservice Pattern:**
   - Independent service with own API
   - Shares database with Node.js backend
   - Communicates via database (no direct API calls)

### Data Flow

```
Node.js Backend → MongoDB (User data, Interactions)
                           ↓
                    Python Service reads
                           ↓
                    RecommendationEngine processes
                           ↓
                    Returns recommendations via API
                           ↓
                    Node.js Backend consumes API (optional)
```

### Component Interaction

```
┌──────────────┐
│ Flask API    │ (app.py)
│   (Routes)   │
└──────┬───────┘
       │
       ↓
┌──────────────┐      ┌──────────────────────┐
│ Django Views │ ←───→│ RecommendationEngine │
│ (DRF)        │      │ (TF-IDF + ELO)       │
└──────┬───────┘      └──────────────────────┘
       │                      │
       ↓                      ↓
┌──────────────┐      ┌──────────────────────┐
│ Djongo Models│      │ ELO Service          │
│ (User,       │      │ (Rating Updates)     │
│ Interaction) │      └──────────────────────┘
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ MongoDB      │ (Shared with Node.js)
└──────────────┘
```

---

## Core Modules

### 1. Flask Application (`app.py`)

**Responsibilities:**
- Initialize Flask app
- Define REST API endpoints
- Handle HTTP requests/responses
- Call recommendation and ELO services

**Endpoints:**
- `GET /api/recommendations/` - Get user recommendations
- `POST /api/interaction/` - Record user interaction and update ELO
- `GET /health` - Health check

**Port:** `8000` (configurable via `PORT` env var)

**Code Structure:**
```python
app = Flask(__name__)
engine = RecommendationEngine()

@app.route('/api/recommendations/', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id')
    recommendations = engine.get_recommendations(user_id)
    # Return formatted results

@app.route('/api/interaction/', methods=['POST'])
def record_interaction():
    # Record interaction in database
    # Update ELO ratings
    # Return success response
```

---

### 2. Django Models (`core/models.py`)

#### User Model

**Structure:**
```python
class User(models.Model):
    _id = models.ObjectIdField()
    email = models.EmailField(unique=True)
    displayName = models.CharField(max_length=255)
    age = models.IntegerField()
    # ... profile fields ...
    elo_score = models.IntegerField(default=1200)  # ELO rating
    
    class Meta:
        db_table = 'users'
        managed = False  # Node.js manages schema
```

**Key Features:**
- Maps to existing MongoDB `users` collection
- `managed = False`: Django doesn't create/alter schema
- Node.js backend is the source of truth for schema
- Python service only reads/updates specific fields (e.g., `elo_score`)

#### Interaction Model

**Structure:**
```python
class Interaction(models.Model):
    actor = models.ForeignKey(User, related_name='actions_performed')
    target = models.ForeignKey(User, related_name='actions_received')
    action_type = models.CharField(max_length=20)  # LIKE, PASS, SUPERLIKE
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'interactions'
```

**Purpose:**
- Tracks user swipe actions
- Used for recommendation algorithm training
- Used for ELO rating updates

---

### 3. Services

#### Recommendation Engine (`services/recommendation.py`)

**Class: `RecommendationEngine`**

**Algorithm:**
1. **Content-Based Filtering (TF-IDF):**
   - Extracts text features: `bio`, `occupation`, `education`, `interests`
   - Uses scikit-learn's `TfidfVectorizer`
   - Calculates cosine similarity between users

2. **ELO Score Similarity:**
   - Compares user ELO scores
   - Users with similar ELO scores are more likely matches

3. **Score Combination:**
   - Weighted average: 70% content similarity + 30% ELO similarity
   - Returns sorted recommendations with match scores

**Methods:**

1. **`__init__(self)`**
   - Initialize `TfidfVectorizer`

2. **`_prepare_data(self, users)`**
   - Convert MongoDB documents to DataFrame
   - Combine text features into single string
   - Extract relevant fields (age, elo_score, location)

3. **`get_recommendations(self, user_id, limit=20)`**
   - Get target user from database
   - Get candidate users (all except target)
   - Prepare data and calculate similarities
   - Combine scores and return top recommendations

**Code Flow:**
```python
def get_recommendations(self, user_id, limit=20):
    # 1. Get target user
    target_user = users_collection.find_one({'_id': ObjectId(user_id)})
    
    # 2. Get candidates
    candidates = list(users_collection.find({...}))
    
    # 3. Prepare data (DataFrame)
    df = self._prepare_data(candidates + [target_user])
    
    # 4. Calculate TF-IDF similarity
    tfidf_matrix = self.vectorizer.fit_transform(df['text_features'])
    cosine_sim = cosine_similarity(target_user_vector, candidate_vectors)
    
    # 5. Calculate ELO similarity
    elo_score = 1 - (elo_diff / max_diff)
    
    # 6. Combine scores
    final_scores = (0.7 * cosine_sim) + (0.3 * elo_score)
    
    # 7. Return top recommendations
    return sorted_recommendations[:limit]
```

#### ELO Rating Service (`services/elo.py`)

**Functions:**

1. **`calculate_expected_score(rating_a, rating_b)`**
   - Calculate expected score using ELO formula
   - Formula: `1 / (1 + 10^((rating_b - rating_a) / 400))`

2. **`update_elo_ratings(winner_id, loser_id)`**
   - Update ELO ratings after an interaction
   - K-factor: 32 (standard chess rating)
   - Winner gains points, loser loses points
   - Updates MongoDB directly (not via Django ORM)

**ELO Logic:**
```python
# If A likes B:
# - B is "winner" (desirable) → B gains ELO
# - A is "loser" → A loses ELO

# If A passes B:
# - A is "winner" → A gains ELO
# - B is "loser" → B loses ELO

expected_winner = calculate_expected_score(winner_elo, loser_elo)
new_winner_elo = winner_elo + K_FACTOR * (1 - expected_winner)
new_loser_elo = loser_elo + K_FACTOR * (0 - expected_loser)
```

**Update Mechanism:**
- Uses PyMongo directly (not Django ORM)
- Updates `elo_score` field in `users` collection
- Returns new ratings (for logging/monitoring)

---

### 4. Django REST Framework Views (`core/views.py`)

**Views:**

1. **`RecommendationView` (APIView)**
   - `GET`: Get recommendations for a user
   - Query param: `user_id`
   - Returns: List of recommended users with match scores

2. **`InteractionView` (APIView)**
   - `POST`: Record interaction and update ELO
   - Body: `{ actor_id, target_id, action }`
   - Creates Interaction record
   - Updates ELO ratings based on action type

**Implementation:**
```python
class RecommendationView(APIView):
    def get(self, req):
        user_id = req.query_params.get('user_id')
        engine = RecommendationEngine()
        recommendations = engine.get_recommendations(user_id)
        
        # Fetch full user objects and return

class InteractionView(APIView):
    def post(self, req):
        actor_id = req.data.get('actor_id')
        target_id = req.data.get('target_id')
        action = req.data.get('action')
        
        # Create Interaction
        Interaction.objects.create(...)
        
        # Update ELO
        if action in ['LIKE', 'SUPERLIKE']:
            update_elo_ratings(target_id, actor_id)  # Target "wins"
        elif action == 'PASS':
            update_elo_ratings(actor_id, target_id)  # Actor "wins"
```

---

### 5. Configuration

#### Config (`config.py`)

**Environment Variables:**
```python
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/sugar_dating_app')
PORT = int(os.getenv('PORT', 8000))
DEBUG = os.getenv('DEBUG', 'True') == 'True'
```

#### Database (`database.py`)

**Connection:**
```python
from pymongo import MongoClient
from config import MONGODB_URI

client = MongoClient(MONGODB_URI)
db = client.get_database()

# Collections
users_collection = db['users']
interactions_collection = db['interactions']
```

**Note:** Uses PyMongo directly (not Djongo) for direct MongoDB access in services.

---

## Matching Algorithm Implementation

### Content-Based Filtering

**Process:**
1. Extract text features from user profiles
2. Combine: `bio + occupation + education + interests`
3. Vectorize using TF-IDF
4. Calculate cosine similarity between users

**Advantages:**
- Recommends users with similar interests/preferences
- Doesn't require interaction history (works for new users)
- Based on profile content

**Limitations:**
- May recommend users who look similar but aren't compatible
- Doesn't consider user behavior/preferences

### ELO Rating System

**Purpose:**
- Quantify user desirability based on interactions
- Higher ELO = more desirable (receives more likes)

**How It Works:**
- Initial rating: 1200 (average)
- K-factor: 32 (rating change sensitivity)
- When user A likes user B:
  - B gains ELO (is desirable)
  - A loses ELO (slightly)
- When user A passes user B:
  - A gains ELO
  - B loses ELO (less desirable)

**Formula:**
```
Expected Score = 1 / (1 + 10^((opponent_rating - my_rating) / 400))
New Rating = old_rating + K * (actual_score - expected_score)
```

**Advantages:**
- Self-adjusting based on user behavior
- Rewards desirable users
- Penalizes users who are frequently passed

### Combined Scoring

**Formula:**
```python
final_score = (0.7 * content_similarity) + (0.3 * elo_similarity)
```

**Weights:**
- 70% content similarity (profile matching)
- 30% ELO similarity (desirability matching)

**Rationale:**
- Prioritize users with similar interests
- Consider desirability as secondary factor
- Balance between content and popularity

---

## API Documentation

### GET /api/recommendations/

**Description:** Get personalized recommendations for a user

**Query Parameters:**
- `user_id` (required): User ID to get recommendations for

**Response:**
```json
[
  {
    "_id": "user_id_1",
    "displayName": "John Doe",
    "age": 28,
    "photos": ["url1", "url2"],
    "match_score": 85.3
  },
  {
    "_id": "user_id_2",
    "displayName": "Jane Smith",
    "age": 26,
    "photos": ["url1"],
    "match_score": 78.9
  }
]
```

**Error Responses:**
- `400`: Missing `user_id` parameter
- `500`: Internal server error

---

### POST /api/interaction/

**Description:** Record a user interaction (like/pass) and update ELO ratings

**Request Body:**
```json
{
  "actor_id": "user_id_1",
  "target_id": "user_id_2",
  "action": "LIKE"  // or "PASS" or "SUPERLIKE"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Interaction recorded"
}
```

**ELO Update Logic:**
- `LIKE` or `SUPERLIKE`: Target gains ELO, Actor loses ELO
- `PASS`: Actor gains ELO, Target loses ELO

**Error Responses:**
- `400`: Missing required fields
- `404`: User not found
- `500`: Internal server error

---

### GET /health

**Description:** Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "service": "matching-engine"
}
```

---

## Database Schema

### Shared MongoDB Collections

#### users Collection

**Fields Used by Python Service:**
- `_id`: ObjectId
- `displayName`: String
- `age`: Number
- `bio`: String
- `occupation`: String
- `education`: String
- `interests`: Array of strings
- **`elo_score`**: Number (updated by Python service, default: 1200)

**Note:** Python service only updates `elo_score`. All other fields managed by Node.js backend.

#### interactions Collection

**Structure:**
```javascript
{
  _id: ObjectId,
  actor_id: ObjectId,      // User who performed action
  target_id: ObjectId,     // User who received action
  action_type: String,     // "LIKE", "PASS", "SUPERLIKE"
  timestamp: Date
}
```

**Indexes:**
- Should have index on `actor_id` and `target_id` for efficient queries
- Should have index on `timestamp` for time-based analysis

---

## Dependencies

### requirements.txt

```
flask
pymongo
scikit-learn
pandas
numpy
python-dotenv
```

**Purpose of Each:**
- **flask**: Lightweight web framework for REST API
- **pymongo**: MongoDB driver for direct database access
- **scikit-learn**: Machine learning library (TF-IDF vectorizer)
- **pandas**: Data manipulation (DataFrames)
- **numpy**: Numerical computing
- **python-dotenv**: Environment variable management

### Django Dependencies (if using Django ORM)

**Note:** Django/Djongo dependencies may be in separate requirements file or installed separately.

- **Django**: Web framework (for models/ORM)
- **djongo**: MongoDB connector for Django
- **djangorestframework**: REST API framework (if using DRF views)

---

## Integration Points

### With Node.js Backend

**Communication Method:** Shared MongoDB database

1. **Data Reading:**
   - Python service reads user data from MongoDB
   - Python service reads interactions from MongoDB

2. **Data Writing:**
   - Python service updates `elo_score` in `users` collection
   - Python service creates `interactions` records

3. **API Consumption (Optional):**
   - Node.js backend can call Python API for recommendations
   - Current implementation: Python service runs independently

### With MongoDB

**Connection:**
- Same MongoDB instance as Node.js backend
- Same database: `sugar_dating_app`
- Same collections: `users`, `interactions`

**Data Consistency:**
- Both services read/write to same collections
- Python service only updates `elo_score` (no conflicts)
- Interactions created by both services

**Schema Management:**
- Node.js backend is source of truth for schema
- Python service uses `managed = False` in Django models
- Python service adapts to schema changes

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- MongoDB instance (shared with Node.js backend)
- pip (Python package manager)

### Installation

1. **Create Virtual Environment:**
   ```bash
   cd matching_engine
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Setup:**
   ```bash
   # Create .env file
   MONGODB_URI=mongodb://localhost:27017/sugar_dating_app
   PORT=8000
   DEBUG=True
   ```

4. **Start Flask Server:**
   ```bash
   python app.py
   ```

   Server will run on `http://localhost:8000`

### Django Setup (if using Django features)

1. **Install Django:**
   ```bash
   pip install django djongo djangorestframework
   ```

2. **Run Migrations (if needed):**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

   **Note:** Since models use `managed = False`, migrations won't create tables (they already exist in MongoDB).

---

## Deployment Considerations

### Production Checklist

1. **Environment Variables:**
   - Set `MONGODB_URI` to production MongoDB
   - Set `DEBUG=False`
   - Set `PORT` if different from 8000

2. **MongoDB:**
   - Use connection string with authentication
   - Use replica set for high availability
   - Monitor query performance

3. **Scaling:**
   - Use WSGI server (gunicorn) for Flask
   - Use process manager (supervisor, systemd)
   - Consider load balancing if high traffic

4. **Performance:**
   - Cache recommendations if needed
   - Optimize TF-IDF calculation (pre-compute vectors)
   - Monitor ELO update performance

5. **Monitoring:**
   - Log recommendation generation times
   - Monitor ELO update frequency
   - Track API endpoint usage
   - Alert on errors

### Integration with Node.js Backend

**Option 1: Direct Database Access (Current)**
- Python service reads/writes directly to MongoDB
- No API calls between services
- Simpler architecture

**Option 2: API Integration**
- Node.js backend calls Python API for recommendations
- Python service exposes REST endpoints
- Better separation of concerns

**Recommended:** Current approach (direct database access) is simpler for this use case.

---

## Algorithm Tuning

### Content-Based Filtering Weights

**Current:** 70% content similarity, 30% ELO similarity

**Adjustments:**
- Increase content weight for new users (less ELO history)
- Increase ELO weight for established users (more interaction data)
- Consider user preferences (age range, location, etc.)

### ELO K-Factor

**Current:** 32

**Adjustments:**
- Higher K-factor: More volatile ratings (faster adaptation)
- Lower K-factor: More stable ratings (slower changes)
- Consider adaptive K-factor based on user's rating confidence

### Recommendation Limit

**Current:** 20 recommendations

**Adjustments:**
- Increase for better coverage
- Decrease for faster response times
- Consider pagination for large result sets

---

## Testing Considerations

### Unit Tests Needed

1. **RecommendationEngine:**
   - Data preparation (text feature extraction)
   - TF-IDF similarity calculation
   - ELO similarity calculation
   - Score combination

2. **ELO Service:**
   - Expected score calculation
   - Rating updates (winner/loser)
   - K-factor application

3. **API Endpoints:**
   - Recommendation endpoint (valid/invalid inputs)
   - Interaction endpoint (all action types)
   - Error handling

### Integration Tests Needed

1. **Database Integration:**
   - Reading user data
   - Creating interactions
   - Updating ELO scores

2. **End-to-End Flow:**
   - User interaction → ELO update → Recommendation change

---

## Troubleshooting Guide

### Common Issues

1. **"User not found" Error**
   - **Cause**: User ID doesn't exist in database
   - **Solution**: Verify user exists in MongoDB
   - **Check**: MongoDB connection string is correct

2. **Recommendations Return Empty**
   - **Cause**: No candidate users in database
   - **Solution**: Ensure users have completed onboarding
   - **Check**: Query filters in `get_recommendations()`

3. **ELO Not Updating**
   - **Cause**: Error in ELO calculation or database update
   - **Solution**: Check logs for errors
   - **Check**: MongoDB write permissions

4. **Slow Recommendations**
   - **Cause**: Large user base, expensive TF-IDF calculation
   - **Solution**: Optimize query (limit candidates)
   - **Solution**: Cache recommendations
   - **Solution**: Use background job for pre-computation

5. **MongoDB Connection Error**
   - **Cause**: MongoDB not running or wrong connection string
   - **Solution**: Verify MongoDB is running
   - **Solution**: Check `MONGODB_URI` environment variable

---

## Summary

The Python matching engine provides:

- **Content-based recommendations**: TF-IDF similarity matching
- **ELO rating system**: User desirability scoring
- **REST API**: Simple endpoints for recommendations and interactions
- **Shared database**: Direct MongoDB access (no API coupling)

**Architecture Highlights:**
- Hybrid Django/Flask approach
- Independent microservice
- Shared database with Node.js backend
- Machine learning-based recommendations
- Self-adjusting rating system

**Note:** This service does NOT handle push notifications. Push notifications are exclusively handled by the Node.js backend service.

---

## Future Enhancements

1. **Collaborative Filtering:**
   - Add user-based collaborative filtering
   - "Users who liked X also liked Y" recommendations

2. **Advanced Features:**
   - Location-based filtering
   - Age range preferences
   - Gender preference filtering

3. **Performance Optimizations:**
   - Pre-compute recommendation vectors
   - Cache frequent queries
   - Batch ELO updates

4. **Analytics:**
   - Track recommendation accuracy
   - Monitor ELO distribution
   - A/B test different algorithms

