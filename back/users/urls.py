from django.urls import path
from .views import (
    RegisterAPI, LogoutView, ProfileView,
    TrainingBookingListCreateView, TrainingBookingDetailView,
    AdminBookingListDetailView, AdminBookingDetailView,
)

urlpatterns = [
    path('register/', RegisterAPI.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('training-bookings/', TrainingBookingListCreateView.as_view(), name='training-bookings'),
    path('training-bookings/<int:pk>/', TrainingBookingDetailView.as_view(), name='training-booking-detail'),
    path('admin/bookings/', AdminBookingListDetailView.as_view(), name='admin-bookings'),
    path('admin/bookings/<int:pk>/', AdminBookingDetailView.as_view(), name='admin-booking-detail'),
]
