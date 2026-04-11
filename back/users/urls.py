from django.urls import path
from .views import (
    RegisterAPI, LogoutView, ProfileView,
    TrainingBookingListCreateView, TrainingBookingDetailView,
    AdminBookingListDetailView, AdminBookingDetailView, PurchaseHistoryListCreateView,
    PurchaseHistoryAdminListView, PurchaseHistoryAdminDetailView,
    TrainingBookingUpdateListView, TrainingBookingUpdateSeenView, TrainingBookingUpdateRespondView,
    TrainingBookingUpdateAlertsView, AdminHeaderAlertsView, AdminProfileListView, AdminProfileDetailView,
    ShopProductListView, AdminShopProductListCreateView, AdminShopProductDetailView,
)

urlpatterns = [
    path('register/', RegisterAPI.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('training-bookings/', TrainingBookingListCreateView.as_view(), name='training-bookings'),
    path('training-bookings/<int:pk>/', TrainingBookingDetailView.as_view(), name='training-booking-detail'),
    path('purchase-history/', PurchaseHistoryListCreateView.as_view(), name='purchase-history'),
    path('admin/bookings/', AdminBookingListDetailView.as_view(), name='admin-bookings'),
    path('admin/bookings/<int:pk>/', AdminBookingDetailView.as_view(), name='admin-booking-detail'),
    path('admin/purchase-history/', PurchaseHistoryAdminListView.as_view(), name='admin-purchase-history'),
    path('admin/purchase-history/<int:pk>/', PurchaseHistoryAdminDetailView.as_view(), name='admin-purchase-history-detail'),
    path('training-booking-updates/', TrainingBookingUpdateListView.as_view(), name='training-booking-updates'),
    path('training-booking-updates/seen/', TrainingBookingUpdateSeenView.as_view(), name='training-booking-updates-seen'),
    path('training-booking-updates/<int:pk>/respond/', TrainingBookingUpdateRespondView.as_view(), name='training-booking-update-respond'),
    path('training-booking-updates/alerts/', TrainingBookingUpdateAlertsView.as_view(), name='training-booking-updates-alerts'),
    path('admin/header-alerts/', AdminHeaderAlertsView.as_view(), name='admin-header-alerts'),
    path('admin/profiles/', AdminProfileListView.as_view(), name='admin-profiles'),
    path('admin/profiles/<int:pk>/', AdminProfileDetailView.as_view(), name='admin-profile-detail'),
    path('shop-products/', ShopProductListView.as_view(), name='shop-products'),
    path('admin/shop-products/', AdminShopProductListCreateView.as_view(), name='admin-shop-products'),
    path('admin/shop-products/<int:pk>/', AdminShopProductDetailView.as_view(), name='admin-shop-product-detail'),
]
