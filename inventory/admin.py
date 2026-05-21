from django.contrib import admin
from .models import Item, WarehouseZone, InventoryRecord


@admin.register(WarehouseZone)
class WarehouseZoneAdmin(admin.ModelAdmin):
    list_display = ['name', 'zone_type', 'location_code', 'capacity', 'current_occupancy', 'utilization_percentage', 'is_active']
    list_filter = ['zone_type', 'is_active']
    search_fields = ['name', 'location_code']


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['sku', 'name', 'category', 'unit_price', 'is_active']
    list_filter = ['category', 'is_active']
    search_fields = ['sku', 'name']


@admin.register(InventoryRecord)
class InventoryRecordAdmin(admin.ModelAdmin):
    list_display = ['item', 'zone', 'quantity', 'reorder_level', 'stock_status', 'last_restocked']
    list_filter = ['zone', 'item__category']
    search_fields = ['item__name', 'item__sku']
