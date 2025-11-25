from djongo import models

class User(models.Model):
    _id = models.ObjectIdField()
    email = models.EmailField(unique=True)
    displayName = models.CharField(max_length=255, null=True, blank=True)
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=50, null=True, blank=True)
    location = models.CharField(max_length=255, null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    
    # Preferences & Details
    preferences = models.CharField(max_length=255, null=True, blank=True)
    relationshipExpectations = models.CharField(max_length=255, null=True, blank=True)
    dealBreakers = models.TextField(null=True, blank=True)
    budget = models.CharField(max_length=100, null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    bodyType = models.CharField(max_length=100, null=True, blank=True)
    ethnicity = models.CharField(max_length=100, null=True, blank=True)
    occupation = models.CharField(max_length=255, null=True, blank=True)
    interests = models.JSONField(null=True, blank=True) # Array of strings
    
    # Extended Profile
    children = models.CharField(max_length=100, null=True, blank=True)
    education = models.CharField(max_length=100, null=True, blank=True)
    religion = models.CharField(max_length=100, null=True, blank=True)
    politics = models.CharField(max_length=100, null=True, blank=True)
    drinking = models.CharField(max_length=100, null=True, blank=True)
    smoking = models.CharField(max_length=100, null=True, blank=True)
    drugs = models.CharField(max_length=100, null=True, blank=True)
    
    # Media
    photos = models.JSONField(null=True, blank=True) # Array of URLs
    
    # Status
    onboardingCompleted = models.BooleanField(default=False)
    isPremium = models.BooleanField(default=False)
    isVerified = models.BooleanField(default=False)
    lastActive = models.DateTimeField(null=True, blank=True)
    
    # ELO Rating (New Field managed by Django)
    elo_score = models.IntegerField(default=1200)

    class Meta:
        db_table = 'users' # Map to existing MongoDB collection
        managed = False # Let Node.js manage the schema, Django just reads/updates ELO

    def __str__(self):
        return self.displayName or self.email

class Interaction(models.Model):
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions_performed')
    target = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actions_received')
    action_type = models.CharField(max_length=20, choices=[
        ('LIKE', 'Like'),
        ('PASS', 'Pass'),
        ('SUPERLIKE', 'Super Like')
    ])
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interactions'
