from django.db import models
from inventory.models import Item, WarehouseZone


class DemandPrediction(models.Model):
    """Stores ML-generated demand predictions for items."""

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='predictions')
    predicted_demand = models.PositiveIntegerField()
    confidence_score = models.FloatField(help_text='Prediction confidence 0.0 to 1.0')
    prediction_date = models.DateField()
    period_days = models.PositiveIntegerField(default=30, help_text='Forecast horizon in days')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-prediction_date']
        unique_together = ['item', 'prediction_date', 'period_days']

    def __str__(self):
        return f"{self.item.name}: {self.predicted_demand} units (next {self.period_days}d)"


class PlacementRecommendation(models.Model):
    """Storage placement recommendations from the optimization engine."""

    PRIORITY_CHOICES = [
        ('HIGH', 'High Priority'),
        ('MEDIUM', 'Medium Priority'),
        ('LOW', 'Low Priority'),
    ]

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='recommendations')
    recommended_zone = models.ForeignKey(WarehouseZone, on_delete=models.CASCADE)
    current_zone = models.ForeignKey(
        WarehouseZone, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='outgoing_recommendations'
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    reason = models.TextField()
    is_applied = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Move {self.item.name} → {self.recommended_zone.name} [{self.priority}]"
