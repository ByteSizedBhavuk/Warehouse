from django.contrib import admin
from .models import DemandPrediction, PlacementRecommendation


@admin.register(DemandPrediction)
class DemandPredictionAdmin(admin.ModelAdmin):
    list_display = ['item', 'predicted_demand', 'confidence_score', 'prediction_date', 'period_days']
    list_filter = ['prediction_date', 'period_days']
    search_fields = ['item__name', 'item__sku']


@admin.register(PlacementRecommendation)
class PlacementRecommendationAdmin(admin.ModelAdmin):
    list_display = ['item', 'recommended_zone', 'current_zone', 'priority', 'is_applied', 'created_at']
    list_filter = ['priority', 'is_applied']
    search_fields = ['item__name']
