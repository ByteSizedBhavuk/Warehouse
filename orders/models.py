from django.db import models
from django.core.validators import MinValueValidator
from inventory.models import Item, WarehouseZone


class Order(models.Model):
    """Represents an order (inbound or outbound) in the warehouse."""

    ORDER_TYPES = [
        ('INBOUND', 'Inbound (Restock)'),
        ('OUTBOUND', 'Outbound (Dispatch)'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    order_number = models.CharField(max_length=50, unique=True)
    order_type = models.CharField(max_length=10, choices=ORDER_TYPES)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} ({self.get_order_type_display()})"

    @property
    def total_items(self):
        return self.items.aggregate(total=models.Sum('quantity'))['total'] or 0

    @property
    def total_value(self):
        total = sum(
            item.quantity * item.item.unit_price
            for item in self.items.select_related('item')
        )
        return round(total, 2)


class OrderItem(models.Model):
    """Individual line item within an order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='order_items')
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    zone = models.ForeignKey(
        WarehouseZone, on_delete=models.SET_NULL, null=True, blank=True,
        help_text='Source zone (outbound) or destination zone (inbound)'
    )

    class Meta:
        unique_together = ['order', 'item']

    def __str__(self):
        return f"{self.item.name} x{self.quantity}"

    @property
    def line_total(self):
        return round(self.quantity * self.item.unit_price, 2)
