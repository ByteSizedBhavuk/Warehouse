import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from inventory.models import Item, WarehouseZone, InventoryRecord
from orders.models import Order, OrderItem
from analytics.models import DemandPrediction, PlacementRecommendation


class Command(BaseCommand):
    help = 'Seed the database with sample warehouse data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # --- Users & Roles ---
        users_to_seed = [
            {'username': 'admin', 'password': 'admin123', 'is_superuser': True, 'is_staff': True, 'email': 'admin@optima.com'},
            {'username': 'manager', 'password': 'manager123', 'is_superuser': False, 'is_staff': True, 'email': 'manager@optima.com'},
            {'username': 'staff', 'password': 'staff123', 'is_superuser': False, 'is_staff': False, 'email': 'staff@optima.com'},
        ]
        for uinfo in users_to_seed:
            user, created = User.objects.get_or_create(username=uinfo['username'], defaults={
                'is_superuser': uinfo['is_superuser'],
                'is_staff': uinfo['is_staff'],
                'email': uinfo['email'],
                'is_active': True,
            })
            if created or not user.check_password(uinfo['password']):
                user.set_password(uinfo['password'])
                user.save()
        self.stdout.write('  [OK] Seeded roles: admin, manager, staff')

        # --- Warehouse Zones ---
        zones_data = [
            {'name': 'Dispatch Bay Alpha', 'zone_type': 'DISPATCH', 'capacity': 500, 'location_code': 'A1'},
            {'name': 'Dispatch Bay Beta', 'zone_type': 'DISPATCH', 'capacity': 400, 'location_code': 'A2'},
            {'name': 'Standard Rack 1', 'zone_type': 'STANDARD', 'capacity': 800, 'location_code': 'B1'},
            {'name': 'Standard Rack 2', 'zone_type': 'STANDARD', 'capacity': 800, 'location_code': 'B2'},
            {'name': 'Standard Rack 3', 'zone_type': 'STANDARD', 'capacity': 600, 'location_code': 'B3'},
            {'name': 'Bulk Storage West', 'zone_type': 'BULK', 'capacity': 2000, 'location_code': 'C1'},
            {'name': 'Bulk Storage East', 'zone_type': 'BULK', 'capacity': 1500, 'location_code': 'C2'},
            {'name': 'Cold Room 1', 'zone_type': 'COLD', 'capacity': 300, 'location_code': 'D1'},
            {'name': 'Hazmat Vault', 'zone_type': 'HAZMAT', 'capacity': 200, 'location_code': 'E1'},
        ]
        zones = []
        for zd in zones_data:
            zone, _ = WarehouseZone.objects.get_or_create(location_code=zd['location_code'], defaults=zd)
            zones.append(zone)
        self.stdout.write(f'  [OK] {len(zones)} warehouse zones')

        # --- Items ---
        items_data = [
            {'sku': 'ELEC-001', 'name': 'HELLO', 'category': 'ELECTRONICS', 'unit_price': 49.99, 'weight_kg': 0.5},
            {'sku': 'ELEC-002', 'name': 'USB-C Charging Hub', 'category': 'ELECTRONICS', 'unit_price': 29.99, 'weight_kg': 0.2},
            {'sku': 'ELEC-003', 'name': 'LED Desk Lamp Pro', 'category': 'ELECTRONICS', 'unit_price': 39.99, 'weight_kg': 1.2},
            {'sku': 'ELEC-004', 'name': 'Noise-Cancelling Headphones', 'category': 'ELECTRONICS', 'unit_price': 149.99, 'weight_kg': 0.3},
            {'sku': 'CLTH-001', 'name': 'Denim Jacket (M)', 'category': 'CLOTHING', 'unit_price': 79.99, 'weight_kg': 0.8},
            {'sku': 'CLTH-002', 'name': 'Running Shoes (42)', 'category': 'CLOTHING', 'unit_price': 119.99, 'weight_kg': 0.6},
            {'sku': 'CLTH-003', 'name': 'Winter Parka (L)', 'category': 'CLOTHING', 'unit_price': 199.99, 'weight_kg': 1.5},
            {'sku': 'FOOD-001', 'name': 'Organic Green Tea (100pk)', 'category': 'FOOD', 'unit_price': 12.99, 'weight_kg': 0.3},
            {'sku': 'FOOD-002', 'name': 'Protein Bars (Box of 24)', 'category': 'FOOD', 'unit_price': 34.99, 'weight_kg': 1.0},
            {'sku': 'FOOD-003', 'name': 'Instant Coffee (500g)', 'category': 'FOOD', 'unit_price': 8.99, 'weight_kg': 0.5},
            {'sku': 'FURN-001', 'name': 'Ergonomic Office Chair', 'category': 'FURNITURE', 'unit_price': 299.99, 'weight_kg': 15.0},
            {'sku': 'FURN-002', 'name': 'Standing Desk (120cm)', 'category': 'FURNITURE', 'unit_price': 449.99, 'weight_kg': 25.0},
            {'sku': 'TOOL-001', 'name': 'Cordless Drill Set', 'category': 'TOOLS', 'unit_price': 89.99, 'weight_kg': 2.5},
            {'sku': 'TOOL-002', 'name': 'Precision Screwdriver Kit', 'category': 'TOOLS', 'unit_price': 24.99, 'weight_kg': 0.4},
            {'sku': 'CHEM-001', 'name': 'Industrial Cleaner (5L)', 'category': 'CHEMICALS', 'unit_price': 19.99, 'weight_kg': 5.2},
            {'sku': 'ELEC-005', 'name': 'Smart Watch Band', 'category': 'ELECTRONICS', 'unit_price': 19.99, 'weight_kg': 0.1},
            {'sku': 'CLTH-004', 'name': 'Cotton T-Shirt (L)', 'category': 'CLOTHING', 'unit_price': 24.99, 'weight_kg': 0.2},
            {'sku': 'TOOL-003', 'name': 'Safety Goggles (Pack of 10)', 'category': 'TOOLS', 'unit_price': 39.99, 'weight_kg': 0.8},
            {'sku': 'FOOD-004', 'name': 'Energy Drink (Case of 12)', 'category': 'FOOD', 'unit_price': 22.99, 'weight_kg': 4.5},
            {'sku': 'FURN-003', 'name': 'Monitor Arm Mount', 'category': 'FURNITURE', 'unit_price': 69.99, 'weight_kg': 3.0},
        ]
        
        # Add dynamic items if we don't have many
        existing_items = Item.objects.count()
        if existing_items < 120:
            categories = ['ELECTRONICS', 'CLOTHING', 'FOOD', 'FURNITURE', 'TOOLS', 'CHEMICALS']
            for j in range(100):
                items_data.append({
                    'sku': f'GEN-{existing_items + 1000 + j}',
                    'name': f'Generated Product {existing_items + j}',
                    'category': random.choice(categories),
                    'unit_price': round(random.uniform(5.0, 499.99), 2),
                    'weight_kg': round(random.uniform(0.1, 40.0), 1)
                })

        for id_ in items_data:
            Item.objects.get_or_create(sku=id_['sku'], defaults=id_)
            
        items = list(Item.objects.all())
        self.stdout.write(f'  [OK] {len(items)} items')

        # --- Inventory Records ---
        records_created = 0
        for item in items:
            # Each item in 1-3 random zones
            num_zones = random.randint(1, 3)
            chosen_zones = random.sample(zones, min(num_zones, len(zones)))
            for zone in chosen_zones:
                qty = random.randint(0, 500)
                reorder = random.randint(5, 50)
                record, created = InventoryRecord.objects.get_or_create(
                    item=item, zone=zone,
                    defaults={
                        'quantity': qty,
                        'reorder_level': reorder,
                        'max_stock': random.randint(500, 1500),
                        'last_restocked': timezone.now() - timedelta(days=random.randint(1, 60)),
                    }
                )
                if created:
                    records_created += 1
        # Update zone occupancy counts
        for zone in zones:
            total = sum(r.quantity for r in zone.inventory_records.all())
            zone.current_occupancy = min(total, zone.capacity)
            zone.save()
        self.stdout.write(f'  [OK] {records_created} inventory records')

        # --- Orders ---
        now = timezone.now()
        orders_created = 0
        existing_orders = Order.objects.count()
        for i in range(100):  # Generate 100 more orders every time
            days_ago = random.randint(0, 90)
            order_date = now - timedelta(days=days_ago)
            order_type = random.choice(['INBOUND', 'OUTBOUND'])
            status = random.choice(['PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED', 'COMPLETED'])
            order_num = f'ORD-{10000 + existing_orders + i}'
            order, created = Order.objects.get_or_create(
                order_number=order_num,
                defaults={
                    'order_type': order_type,
                    'status': status,
                    'created_at': order_date,
                    'completed_at': order_date + timedelta(days=random.randint(1, 5)) if status == 'COMPLETED' else None,
                }
            )
            if created:
                orders_created += 1
                # Add 1-5 items to each order
                order_items = random.sample(items, random.randint(1, min(5, len(items))))
                for oi in order_items:
                    OrderItem.objects.create(
                        order=order,
                        item=oi,
                        quantity=random.randint(1, 50),
                        zone=random.choice(zones),
                    )
        self.stdout.write(f'  [OK] {orders_created} orders')

        # --- Demand Predictions ---
        predictions_created = 0
        for item in items:
            pred, created = DemandPrediction.objects.get_or_create(
                item=item,
                prediction_date=timezone.now().date(),
                period_days=30,
                defaults={
                    'predicted_demand': random.randint(10, 500),
                    'confidence_score': round(random.uniform(0.5, 0.98), 2),
                }
            )
            if created:
                predictions_created += 1
        self.stdout.write(f'  [OK] {predictions_created} demand predictions')

        # --- Placement Recommendations ---
        recs_created = 0
        high_demand_items = DemandPrediction.objects.order_by('-predicted_demand')[:8]
        dispatch_zones = WarehouseZone.objects.filter(zone_type='DISPATCH')
        for pred in high_demand_items:
            current = pred.item.inventory_records.first()
            if current and dispatch_zones.exists():
                rec, created = PlacementRecommendation.objects.get_or_create(
                    item=pred.item,
                    recommended_zone=dispatch_zones.first(),
                    defaults={
                        'current_zone': current.zone,
                        'priority': 'HIGH' if pred.predicted_demand > 300 else 'MEDIUM',
                        'reason': f'Predicted demand of {pred.predicted_demand} units in next 30 days. '
                                  f'Moving closer to dispatch for faster fulfillment.',
                    }
                )
                if created:
                    recs_created += 1
        self.stdout.write(f'  [OK] {recs_created} placement recommendations')

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
