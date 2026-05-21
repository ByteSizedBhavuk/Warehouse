from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import DemandPrediction, PlacementRecommendation
from .serializers import DemandPredictionSerializer, PlacementRecommendationSerializer


from django.db import transaction
from rest_framework import status
from inventory.models import InventoryRecord

class DemandPredictionViewSet(viewsets.ModelViewSet):
    queryset = DemandPrediction.objects.select_related('item').all()
    serializer_class = DemandPredictionSerializer
    filterset_fields = ['item', 'period_days']
    ordering_fields = ['predicted_demand', 'confidence_score', 'prediction_date']

    @action(detail=False, methods=['get'])
    def top_demand(self, request):
        """Return items with highest predicted demand."""
        limit = int(request.query_params.get('limit', 10))
        top = self.queryset.order_by('-predicted_demand')[:limit]
        serializer = self.get_serializer(top, many=True)
        return Response(serializer.data)


class PlacementRecommendationViewSet(viewsets.ModelViewSet):
    queryset = PlacementRecommendation.objects.select_related(
        'item', 'recommended_zone', 'current_zone'
    ).all()
    serializer_class = PlacementRecommendationSerializer
    filterset_fields = ['priority', 'is_applied']
    ordering_fields = ['priority', 'created_at']

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Return recommendations that haven't been applied yet."""
        pending = self.queryset.filter(is_applied=False)
        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply the placement recommendation by moving item to the recommended zone."""
        rec = self.get_object()
        if rec.is_applied:
            return Response({'error': 'Recommendation already applied'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Get or create record in recommended zone
            recommended_record, created = InventoryRecord.objects.get_or_create(
                item=rec.item,
                zone=rec.recommended_zone,
                defaults={'quantity': 0}
            )

            # Move stock from current zone if present
            if rec.current_zone:
                try:
                    current_record = InventoryRecord.objects.get(item=rec.item, zone=rec.current_zone)
                    recommended_record.quantity += current_record.quantity
                    current_record.delete()  # Clean up old mapping
                except InventoryRecord.DoesNotExist:
                    pass

            recommended_record.save()

            # Mark recommendation as applied
            rec.is_applied = True
            rec.save()

        return Response({'success': True, 'message': f'Moved {rec.item.name} to {rec.recommended_zone.name}'})


import math
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from django.db.models.functions import TruncDate
from inventory.models import Item, WarehouseZone
from orders.models import OrderItem

class AdieViewSet(viewsets.ViewSet):
    """Adaptive Demand Intelligence Engine (ADIE) ViewSet."""
    def list(self, request):
        now = timezone.now()
        recent_start = now - timedelta(days=7)
        preceding_start = now - timedelta(days=14)
        thirty_days_start = now - timedelta(days=30)

        # 1. Calculate outbound quantities for recent (last 7 days) and preceding (7-14 days ago) periods
        recent_items_qty = OrderItem.objects.filter(
            order__order_type='OUTBOUND',
            order__status='COMPLETED',
            order__created_at__gte=recent_start
        ).values('item_id').annotate(total_qty=Sum('quantity'))

        preceding_items_qty = OrderItem.objects.filter(
            order__order_type='OUTBOUND',
            order__status='COMPLETED',
            order__created_at__gte=preceding_start,
            order__created_at__lt=recent_start
        ).values('item_id').annotate(total_qty=Sum('quantity'))

        recent_qty_map = {x['item_id']: x['total_qty'] for x in recent_items_qty}
        preceding_qty_map = {x['item_id']: x['total_qty'] for x in preceding_items_qty}

        # 2. Calculate outbound quantities for the last 30 days to compute volume-based score
        qty_30d = OrderItem.objects.filter(
            order__order_type='OUTBOUND',
            order__status='COMPLETED',
            order__created_at__gte=thirty_days_start
        ).values('item_id').annotate(total_qty=Sum('quantity'))

        qty_30d_map = {x['item_id']: x['total_qty'] for x in qty_30d}
        max_qty_30d = max(qty_30d_map.values()) if qty_30d_map else 0
        if max_qty_30d == 0:
            max_qty_30d = 1

        # 3. Build dynamic demand intelligence results
        items = Item.objects.filter(is_active=True)
        results = []

        for item in items:
            recent_qty = recent_qty_map.get(item.id, 0)
            preceding_qty = preceding_qty_map.get(item.id, 0)

            if preceding_qty == 0:
                growth_rate = 100.0 if recent_qty > 0 else 0.0
            else:
                growth_rate = round(((recent_qty - preceding_qty) / preceding_qty) * 100.0, 1)

            if growth_rate > 10.0:
                trend = 'Rising'
            elif growth_rate < -10.0:
                trend = 'Falling'
            else:
                trend = 'Stable'

            item_qty_30d = qty_30d_map.get(item.id, 0)
            volume_score = (item_qty_30d / max_qty_30d) * 70.0
            growth_bonus = min(30.0, growth_rate / 5.0) if growth_rate > 0 else 0.0
            demand_score = round(min(100.0, volume_score + growth_bonus), 1)

            results.append({
                'id': item.id,
                'sku': item.sku,
                'name': item.name,
                'category': item.category,
                'recent_qty': recent_qty,
                'preceding_qty': preceding_qty,
                'growth_rate': growth_rate,
                'trend': trend,
                'demand_score': demand_score
            })

        # Sort results by demand score descending
        results = sorted(results, key=lambda x: x['demand_score'], reverse=True)
        return Response(results)


class HeatViewSet(viewsets.ViewSet):
    """Warehouse Spatial Heat Intelligence ViewSet."""
    def list(self, request):
        now = timezone.now()
        thirty_days_start = now - timedelta(days=30)

        # 1. Sum access frequency (order line counts) touching each zone over the last 30 days
        zone_access = OrderItem.objects.filter(
            order__status='COMPLETED',
            order__created_at__gte=thirty_days_start,
            zone__isnull=False
        ).values('zone_id').annotate(access_count=Count('id'))

        zone_access_map = {x['zone_id']: x['access_count'] for x in zone_access}
        max_access = max(zone_access_map.values()) if zone_access_map else 0
        if max_access == 0:
            max_access = 1

        # 2. Evaluate active zones and congestion status
        zones = WarehouseZone.objects.filter(is_active=True)
        results = []

        for zone in zones:
            access_count = zone_access_map.get(zone.id, 0)
            heat_score = round((access_count / max_access) * 100.0, 1)
            util = zone.utilization_percentage

            if util >= 80.0 and heat_score >= 70.0:
                congestion_status = 'Overcrowded'
            elif util <= 15.0 and heat_score <= 15.0:
                congestion_status = 'Underutilized'
            else:
                congestion_status = 'Normal'

            results.append({
                'id': zone.id,
                'name': zone.name,
                'location_code': zone.location_code,
                'zone_type': zone.zone_type,
                'capacity': zone.capacity,
                'current_occupancy': zone.current_occupancy,
                'utilization_percentage': util,
                'access_count': access_count,
                'heat_score': heat_score,
                'congestion_status': congestion_status
            })

        return Response(results)


class VolatilityViewSet(viewsets.ViewSet):
    """Demand Volatility Analysis ViewSet."""
    def list(self, request):
        now = timezone.now()
        thirty_days_start = now - timedelta(days=30)

        # 1. Group outbound completed orders by item and day for the last 30 days
        daily_demand = OrderItem.objects.filter(
            order__order_type='OUTBOUND',
            order__status='COMPLETED',
            order__created_at__gte=thirty_days_start
        ).annotate(date=TruncDate('order__created_at')).values('item_id', 'date').annotate(day_qty=Sum('quantity'))

        # Map to items
        item_days_map = {}
        for entry in daily_demand:
            item_id = entry['item_id']
            qty = entry['day_qty']
            if item_id not in item_days_map:
                item_days_map[item_id] = []
            item_days_map[item_id].append(qty)

        items = Item.objects.filter(is_active=True)
        results = []

        for item in items:
            q_list = item_days_map.get(item.id, [])
            # Pad with 0s to represent the full 30-day window
            padding_needed = 30 - len(q_list)
            if padding_needed > 0:
                q_list.extend([0] * padding_needed)

            n = len(q_list)
            mean = sum(q_list) / n
            variance = sum((x - mean) ** 2 for x in q_list) / n
            std_dev = math.sqrt(variance)
            cv = std_dev / mean if mean > 0 else 0.0

            if mean == 0:
                volatility_class = 'Stable'
            elif cv < 0.3:
                volatility_class = 'Stable'
            elif cv < 0.75:
                volatility_class = 'Moderate'
            else:
                volatility_class = 'Volatile'

            results.append({
                'id': item.id,
                'sku': item.sku,
                'name': item.name,
                'category': item.category,
                'mean_demand': round(mean, 2),
                'variance': round(variance, 2),
                'std_dev': round(std_dev, 2),
                'coefficient_of_variation': round(cv, 3),
                'volatility_class': volatility_class
            })

        # Sort by coefficient of variation descending (highest volatility first)
        results = sorted(results, key=lambda x: x['coefficient_of_variation'], reverse=True)
        return Response(results)


