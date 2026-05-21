from django.db import models
from django.core.validators import MinValueValidator


class WarehouseZone(models.Model):
    """Represents a physical zone/section within the warehouse."""

    ZONE_TYPES = [
        ('DISPATCH', 'Near Dispatch'),
        ('STANDARD', 'Standard Storage'),
        ('BULK', 'Bulk Storage'),
        ('COLD', 'Cold Storage'),
        ('HAZMAT', 'Hazardous Materials'),
    ]

    name = models.CharField(max_length=100, unique=True)
    zone_type = models.CharField(max_length=20, choices=ZONE_TYPES, default='STANDARD')
    capacity = models.PositiveIntegerField(help_text='Maximum number of items this zone can hold')
    current_occupancy = models.PositiveIntegerField(default=0)
    location_code = models.CharField(max_length=20, unique=True, help_text='e.g. A1, B3, C7')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['location_code']

    def __str__(self):
        return f"{self.name} ({self.location_code})"

    @property
    def utilization_percentage(self):
        if self.capacity == 0:
            return 0
        return round((self.current_occupancy / self.capacity) * 100, 1)

    @property
    def available_space(self):
        return max(0, self.capacity - self.current_occupancy)


class Item(models.Model):
    """Represents a product/item stored in the warehouse."""

    CATEGORY_CHOICES = [
        ('ELECTRONICS', 'Electronics'),
        ('CLOTHING', 'Clothing'),
        ('FOOD', 'Food & Beverages'),
        ('FURNITURE', 'Furniture'),
        ('TOOLS', 'Tools & Hardware'),
        ('CHEMICALS', 'Chemicals'),
        ('OTHER', 'Other'),
    ]

    sku = models.CharField(max_length=50, unique=True, verbose_name='SKU')
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='OTHER')
    description = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    weight_kg = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.sku} — {self.name}"


class InventoryRecord(models.Model):
    """Tracks the quantity of an item in a specific warehouse zone."""

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='inventory_records')
    zone = models.ForeignKey(WarehouseZone, on_delete=models.CASCADE, related_name='inventory_records')
    quantity = models.PositiveIntegerField(default=0)
    reorder_level = models.PositiveIntegerField(default=10, help_text='Alert when stock falls below this')
    max_stock = models.PositiveIntegerField(default=1000)
    last_restocked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['item', 'zone']
        ordering = ['item__name']

    def __str__(self):
        return f"{self.item.name} in {self.zone.name}: {self.quantity} units"

    @property
    def is_low_stock(self):
        return self.quantity <= self.reorder_level

    @property
    def stock_status(self):
        if self.quantity == 0:
            return 'OUT_OF_STOCK'
        elif self.is_low_stock:
            return 'LOW'
        elif self.quantity >= self.max_stock:
            return 'OVERSTOCKED'
        return 'NORMAL'

    def save(self, *args, **kwargs):
        old_zone = None
        if self.pk:
            try:
                old_record = InventoryRecord.objects.get(pk=self.pk)
                if old_record.zone_id != self.zone_id:
                    old_zone = old_record.zone
            except InventoryRecord.DoesNotExist:
                pass

        super().save(*args, **kwargs)
        
        # Update current zone occupancy
        from django.db.models import Sum
        total_qty = self.zone.inventory_records.aggregate(total=Sum('quantity'))['total'] or 0
        self.zone.current_occupancy = total_qty
        self.zone.save()

        # Update old zone occupancy if it changed
        if old_zone:
            old_total = old_zone.inventory_records.aggregate(total=Sum('quantity'))['total'] or 0
            old_zone.current_occupancy = old_total
            old_zone.save()

    def delete(self, *args, **kwargs):
        zone = self.zone
        super().delete(*args, **kwargs)
        from django.db.models import Sum
        total_qty = zone.inventory_records.aggregate(total=Sum('quantity'))['total'] or 0
        zone.current_occupancy = total_qty
        zone.save()
