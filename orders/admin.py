from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'order_type', 'status', 'total_items', 'total_value', 'created_at']
    list_filter = ['order_type', 'status']
    search_fields = ['order_number']
    inlines = [OrderItemInline]
