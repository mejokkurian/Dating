from django.urls import path
from .views import RecommendationView, InteractionView

urlpatterns = [
    path('recommendations/', RecommendationView.as_view(), name='recommendations'),
    path('interaction/', InteractionView.as_view(), name='interaction'),
]
