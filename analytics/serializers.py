from rest_framework import serializers
from .models import DemandPrediction, PlacementRecommendation


class DemandPredictionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)

    class Meta:
        model = DemandPrediction
        fields = [
            'id', 'item', 'item_name', 'item_sku',
            'predicted_demand', 'confidence_score',
            'prediction_date', 'period_days', 'created_at',
        ]


class PlacementRecommendationSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    recommended_zone_name = serializers.CharField(source='recommended_zone.name', read_only=True)
    current_zone_name = serializers.CharField(source='current_zone.name', read_only=True, default=None)

    class Meta:
        model = PlacementRecommendation
        fields = [
            'id', 'item', 'item_name',
            'recommended_zone', 'recommended_zone_name',
            'current_zone', 'current_zone_name',
            'priority', 'reason', 'is_applied', 'created_at',
        ]
