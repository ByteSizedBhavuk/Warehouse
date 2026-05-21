from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q
from .models import Item, WarehouseZone, InventoryRecord
from .serializers import ItemSerializer, WarehouseZoneSerializer, InventoryRecordSerializer


class WarehouseZoneViewSet(viewsets.ModelViewSet):
    queryset = WarehouseZone.objects.all()
    serializer_class = WarehouseZoneSerializer
    filterset_fields = ['zone_type', 'is_active']
    search_fields = ['name', 'location_code']
    ordering_fields = ['name', 'capacity', 'current_occupancy']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return overall zone utilization summary."""
        zones = WarehouseZone.objects.filter(is_active=True)
        total_capacity = zones.aggregate(total=Sum('capacity'))['total'] or 0
        total_occupancy = zones.aggregate(total=Sum('current_occupancy'))['total'] or 0
        return Response({
            'total_zones': zones.count(),
            'total_capacity': total_capacity,
            'total_occupancy': total_occupancy,
            'overall_utilization': round((total_occupancy / total_capacity * 100), 1) if total_capacity else 0,
        })


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    filterset_fields = ['category', 'is_active']
    search_fields = ['sku', 'name', 'description']
    ordering_fields = ['name', 'unit_price', 'created_at']


class InventoryRecordViewSet(viewsets.ModelViewSet):
    queryset = InventoryRecord.objects.select_related('item', 'zone').all()
    serializer_class = InventoryRecordSerializer
    filterset_fields = ['item', 'zone', 'item__category']
    search_fields = ['item__name', 'item__sku']
    ordering_fields = ['quantity', 'last_restocked']

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Return all items that are at or below reorder level."""
        low = self.queryset.filter(quantity__lte=F('reorder_level'))
        serializer = self.get_serializer(low, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Aggregate stats for the dashboard."""
        records = InventoryRecord.objects.select_related('item', 'zone')
        total_items = Item.objects.filter(is_active=True).count()
        total_stock = records.aggregate(total=Sum('quantity'))['total'] or 0
        low_stock_count = records.filter(quantity__lte=F('reorder_level')).count()
        out_of_stock = records.filter(quantity=0).count()

        # Category breakdown
        category_data = (
            records.values('item__category')
            .annotate(total_qty=Sum('quantity'), item_count=Count('item', distinct=True))
            .order_by('-total_qty')
        )

        return Response({
            'total_items': total_items,
            'total_stock_units': total_stock,
            'low_stock_alerts': low_stock_count,
            'out_of_stock_count': out_of_stock,
            'category_breakdown': list(category_data),
        })


from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication
from django.contrib.auth import authenticate, login, logout

class CsrfExemptSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return  # Bypass CSRF checks for APIs during development

class LoginView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user is not None:
            if user.is_active:
                login(request, user)
                role = 'ADMIN' if user.is_superuser else ('MANAGER' if user.is_staff else 'STAFF')
                clearance = 'Level 4 Clearance' if user.is_superuser else ('Level 3 Clearance' if user.is_staff else 'Level 2 Clearance')
                return Response({
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': role,
                    'clearance': clearance
                })
            else:
                return Response({'error': 'User account is disabled'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        logout(request)
        return Response({'success': True})

class MeView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            user = request.user
            role = 'ADMIN' if user.is_superuser else ('MANAGER' if user.is_staff else 'STAFF')
            clearance = 'Level 4 Clearance' if user.is_superuser else ('Level 3 Clearance' if user.is_staff else 'Level 2 Clearance')
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': role,
                'clearance': clearance
            })
        return Response({'error': 'Not authenticated'}, status=status.HTTP_401_UNAUTHORIZED)

