from rest_framework import serializers
from .models import Item, WarehouseZone, InventoryRecord


class WarehouseZoneSerializer(serializers.ModelSerializer):
    utilization_percentage = serializers.ReadOnlyField()
    available_space = serializers.ReadOnlyField()

    class Meta:
        model = WarehouseZone
        fields = [
            'id', 'name', 'zone_type', 'capacity', 'current_occupancy',
            'location_code', 'description', 'is_active',
            'utilization_percentage', 'available_space',
            'created_at', 'updated_at',
        ]


class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            'id', 'sku', 'name', 'category', 'description',
            'unit_price', 'weight_kg', 'is_active',
            'created_at', 'updated_at',
        ]


class InventoryRecordSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    zone_name = serializers.CharField(source='zone.name', read_only=True)
    stock_status = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = InventoryRecord
        fields = [
            'id', 'item', 'item_name', 'item_sku',
            'zone', 'zone_name', 'quantity', 'reorder_level',
            'max_stock', 'stock_status', 'is_low_stock',
            'last_restocked', 'created_at', 'updated_at',
        ]
