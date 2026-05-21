from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderCreateSerializer, OrderItemSerializer


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.prefetch_related('items__item').all()
    filterset_fields = ['order_type', 'status']
    search_fields = ['order_number']
    ordering_fields = ['created_at', 'status']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrderCreateSerializer
        return OrderSerializer

    def perform_create(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        from inventory.models import InventoryRecord

        with transaction.atomic():
            order = serializer.save()
            if order.status == 'COMPLETED':
                for order_item in order.items.all():
                    if not order_item.zone:
                        raise ValidationError(f"Order item {order_item.item.name} has no zone assigned.")

                    if order.order_type == 'INBOUND':
                        record, created = InventoryRecord.objects.get_or_create(
                            item=order_item.item,
                            zone=order_item.zone,
                            defaults={'quantity': 0}
                        )
                        record.quantity += order_item.quantity
                        record.save()
                    elif order.order_type == 'OUTBOUND':
                        try:
                            record = InventoryRecord.objects.get(
                                item=order_item.item,
                                zone=order_item.zone
                            )
                        except InventoryRecord.DoesNotExist:
                            raise ValidationError(f"No stock record found for {order_item.item.name} in zone {order_item.zone.name}.")
                        
                        if record.quantity < order_item.quantity:
                            raise ValidationError(
                                f"Insufficient stock for {order_item.item.name} in zone {order_item.zone.name}. "
                                f"Available: {record.quantity}, Requested: {order_item.quantity}"
                            )
                        record.quantity -= order_item.quantity
                        record.save()
                
                order.completed_at = timezone.now()
                order.save()

    def perform_update(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        from inventory.models import InventoryRecord
        
        instance = self.get_object()
        old_status = instance.status
        new_status = serializer.validated_data.get('status', old_status)

        if old_status != 'COMPLETED' and new_status == 'COMPLETED':
            with transaction.atomic():
                for order_item in instance.items.all():
                    if not order_item.zone:
                        raise ValidationError(f"Order item {order_item.item.name} has no zone assigned.")

                    if instance.order_type == 'INBOUND':
                        record, created = InventoryRecord.objects.get_or_create(
                            item=order_item.item,
                            zone=order_item.zone,
                            defaults={'quantity': 0}
                        )
                        record.quantity += order_item.quantity
                        record.save()
                    elif instance.order_type == 'OUTBOUND':
                        try:
                            record = InventoryRecord.objects.get(
                                item=order_item.item,
                                zone=order_item.zone
                            )
                        except InventoryRecord.DoesNotExist:
                            raise ValidationError(f"No stock record found for {order_item.item.name} in zone {order_item.zone.name}.")
                        
                        if record.quantity < order_item.quantity:
                            raise ValidationError(
                                f"Insufficient stock for {order_item.item.name} in zone {order_item.zone.name}. "
                                f"Available: {record.quantity}, Requested: {order_item.quantity}"
                            )
                        record.quantity -= order_item.quantity
                        record.save()

                serializer.save(completed_at=timezone.now())
        else:
            serializer.save()

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return order statistics for dashboard."""
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)

        orders = Order.objects.all()
        recent_orders = orders.filter(created_at__gte=last_30_days)

        return Response({
            'total_orders': orders.count(),
            'pending_orders': orders.filter(status='PENDING').count(),
            'processing_orders': orders.filter(status='PROCESSING').count(),
            'completed_this_month': recent_orders.filter(status='COMPLETED').count(),
            'orders_last_7_days': orders.filter(created_at__gte=last_7_days).count(),
            'inbound_this_month': recent_orders.filter(order_type='INBOUND').count(),
            'outbound_this_month': recent_orders.filter(order_type='OUTBOUND').count(),
        })

    @action(detail=False, methods=['get'])
    def trend(self, request):
        """Return daily order counts for the last 30 days."""
        now = timezone.now()
        days = int(request.query_params.get('days', 30))
        start = now - timedelta(days=days)

        orders = (
            Order.objects.filter(created_at__gte=start)
            .extra({'date': "date(created_at)"})
            .values('date', 'order_type')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        return Response(list(orders))


class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('item', 'order', 'zone').all()
    serializer_class = OrderItemSerializer
    filterset_fields = ['order', 'item']
