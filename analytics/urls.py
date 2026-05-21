from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'predictions', views.DemandPredictionViewSet)
router.register(r'recommendations', views.PlacementRecommendationViewSet)
router.register(r'adie', views.AdieViewSet, basename='adie')
router.register(r'heat', views.HeatViewSet, basename='heat')
router.register(r'volatility', views.VolatilityViewSet, basename='volatility')

urlpatterns = [
    path('', include(router.urls)),
]
