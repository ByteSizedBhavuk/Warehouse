from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    line_total = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'item', 'item_name', 'item_sku', 'quantity', 'zone', 'line_total']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    total_value = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'order_type', 'status', 'notes',
            'total_items', 'total_value', 'items',
            'created_at', 'updated_at', 'completed_at',
        ]


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['item', 'quantity', 'zone']


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders with nested items."""
    items = OrderItemCreateSerializer(many=True, required=False)

    class Meta:
        model = Order
        fields = ['order_number', 'order_type', 'status', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        from django.db import transaction
        with transaction.atomic():
            order = Order.objects.create(**validated_data)
            for item_data in items_data:
                OrderItem.objects.create(order=order, **item_data)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        return instance
