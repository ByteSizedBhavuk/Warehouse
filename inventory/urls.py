from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'zones', views.WarehouseZoneViewSet)
router.register(r'items', views.ItemViewSet)
router.register(r'records', views.InventoryRecordViewSet)

urlpatterns = [
    path('auth/login/', views.LoginView.as_view(), name='auth_login'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth_logout'),
    path('auth/me/', views.MeView.as_view(), name='auth_me'),
    path('', include(router.urls)),
]
