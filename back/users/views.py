from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Profile, TrainingBooking
from .serializers import (
    RegisterSerializer, LogoutSerializer, ProfileSerializer, ProfileUpdateSerializer,
    TrainingBookingSerializer, AdminBookingSerializer,
)

class RegisterAPI(generics.GenericAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": RegisterSerializer(user, context=self.get_serializer_context()).data,
            "message": "User Created Successfully. Now perform Login to get your token"
        })

class LogoutView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ProfileView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(profile, context={'request': request}).data)


class TrainingBookingListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        bookings = TrainingBooking.objects.filter(user=request.user)
        serializer = TrainingBookingSerializer(bookings, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TrainingBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TrainingBookingDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get_booking(self, request, pk):
        try:
            return TrainingBooking.objects.get(pk=pk, user=request.user)
        except TrainingBooking.DoesNotExist:
            return None

    def patch(self, request, pk):
        booking = self.get_booking(request, pk)
        if not booking:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TrainingBookingSerializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        booking = self.get_booking(request, pk)
        if not booking:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBookingListDetailView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def get(self, request):
        bookings = TrainingBooking.objects.select_related('user').order_by('-date', '-time')
        serializer = AdminBookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AdminBookingDetailView(APIView):
    permission_classes = (permissions.IsAdminUser,)

    def patch(self, request, pk):
        try:
            booking = TrainingBooking.objects.get(pk=pk)
        except TrainingBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TrainingBookingSerializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        try:
            booking = TrainingBooking.objects.get(pk=pk)
        except TrainingBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
