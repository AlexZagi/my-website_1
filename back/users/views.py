from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Profile, TrainingBooking, PurchaseHistory, PurchaseStatusHistory, TrainingBookingUpdate, ShopProduct
from .serializers import (
    RegisterSerializer, LogoutSerializer, ProfileSerializer, ProfileUpdateSerializer,
    TrainingBookingSerializer, AdminBookingSerializer, PurchaseHistorySerializer, PurchaseHistoryAdminSerializer,
    TrainingBookingUpdateSerializer, AdminProfileSerializer, ShopProductSerializer,
)

from django.db.models import Max
from django.utils import timezone

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
        serializer = TrainingBookingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(user=request.user)
        profile, _ = Profile.objects.get_or_create(user=request.user)
        # Симуляция SMS-уведомления в консоли сервера.
        print(
            f"[SMS] Пользователь {request.user.username}: "
            f"вы записаны на {booking.get_workout_type_display()} "
            f"{booking.date} в {booking.time.strftime('%H:%M')}. "
            f"Сообщение отправлено на номер {profile.phone or 'не указан'}.",
            flush=True,
        )
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
        serializer = TrainingBookingSerializer(
            booking, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(admin_updated=False)
        return Response(serializer.data)

    def delete(self, request, pk):
        booking = self.get_booking(request, pk)
        if not booking:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminBookingListDetailView(APIView):
    permission_classes = ()

    def _has_trainer_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_TRAINER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Тренер".'}, status=status.HTTP_403_FORBIDDEN)

    def get(self, request):
        if not self._has_trainer_access(request):
            return self._forbidden_response()
        bookings = TrainingBooking.objects.select_related('user', 'user__profile').order_by('-date', '-time')
        serializer = AdminBookingSerializer(bookings, many=True)
        return Response(serializer.data)


class AdminBookingDetailView(APIView):
    permission_classes = ()

    def _has_trainer_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_TRAINER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Тренер".'}, status=status.HTTP_403_FORBIDDEN)

    def patch(self, request, pk):
        if not self._has_trainer_access(request):
            return self._forbidden_response()
        try:
            booking = TrainingBooking.objects.get(pk=pk)
        except TrainingBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        old_values = {
            'workout_type': booking.workout_type,
            'date': booking.date,
            'time': booking.time,
            'trainer': booking.trainer,
            'comments': booking.comments,
        }
        serializer = TrainingBookingSerializer(
            booking,
            data=request.data,
            partial=True,
            context={'request': request, 'skip_booking_date_guard': True},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(admin_updated=True)

        # Создаем уведомление пользователю о конкретных изменениях.
        TrainingBookingUpdate.objects.create(
            booking=booking,
            decision=TrainingBookingUpdate.STATUS_PENDING,
            old_workout_type=old_values['workout_type'],
            old_date=old_values['date'],
            old_time=old_values['time'],
            old_trainer=old_values.get('trainer', ''),
            old_comments=old_values.get('comments', ''),
            new_workout_type=booking.workout_type,
            new_date=booking.date,
            new_time=booking.time,
            new_trainer=booking.trainer,
            new_comments=booking.comments,
        )

        profile, _ = Profile.objects.get_or_create(user=booking.user)
        # Симуляция SMS-уведомления в консоли сервера.
        print(
            f"[SMS] Пользователь {booking.user.username}: "
            f"администратор изменил вашу запись на {booking.get_workout_type_display()} "
            f"{booking.date} в {booking.time.strftime('%H:%M')}. "
            f"Сообщение отправлено на номер {profile.phone or 'не указан'}.",
            flush=True,
        )
        return Response(AdminBookingSerializer(booking).data)

    def delete(self, request, pk):
        if not self._has_trainer_access(request):
            return self._forbidden_response()
        try:
            booking = TrainingBooking.objects.get(pk=pk)
        except TrainingBooking.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        booking.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TrainingBookingUpdateListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        updates = (
            TrainingBookingUpdate.objects.select_related('booking')
            .filter(booking__user=request.user)
            .filter(decision=TrainingBookingUpdate.STATUS_PENDING)
            .order_by('-created_at')
        )
        serializer = TrainingBookingUpdateSerializer(updates, many=True)
        return Response(serializer.data)


class TrainingBookingUpdateSeenView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        now = timezone.now()
        qs = TrainingBookingUpdate.objects.filter(
            booking__user=request.user,
            decision=TrainingBookingUpdate.STATUS_PENDING,
            seen_at__isnull=True,
        )
        updated_count = qs.update(seen_at=now)
        return Response({'updated': updated_count})


class TrainingBookingUpdateRespondView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request, pk):
        try:
            update = TrainingBookingUpdate.objects.select_related('booking').get(pk=pk, booking__user=request.user)
        except TrainingBookingUpdate.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        decision = request.data.get('decision') or request.data.get('status')
        decision = (decision or '').lower()

        if decision not in (TrainingBookingUpdate.STATUS_ACCEPTED, TrainingBookingUpdate.STATUS_REJECTED):
            return Response({'detail': 'Некорректное решение. Используйте "accepted" или "rejected".'}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        booking = update.booking

        if decision == TrainingBookingUpdate.STATUS_ACCEPTED:
            update.decision = TrainingBookingUpdate.STATUS_ACCEPTED
            update.responded_at = now
            update.seen_at = update.seen_at or now
            update.save()
        else:
            # Откатим запись к старым данным.
            booking.workout_type = update.old_workout_type
            booking.date = update.old_date
            booking.time = update.old_time
            booking.trainer = update.old_trainer
            booking.comments = update.old_comments
            booking.admin_updated = False
            booking.save()

            update.decision = TrainingBookingUpdate.STATUS_REJECTED
            update.responded_at = now
            update.seen_at = update.seen_at or now
            update.save()

        # Если есть еще непроверенные апдейты по этому booking - admin_updated остается True.
        has_pending_other = TrainingBookingUpdate.objects.filter(
            booking=booking,
            decision=TrainingBookingUpdate.STATUS_PENDING,
        ).exists()
        booking.admin_updated = has_pending_other
        booking.save(update_fields=['admin_updated'])

        return Response(TrainingBookingUpdateSerializer(update).data)


class TrainingBookingUpdateAlertsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        has_unseen = TrainingBookingUpdate.objects.filter(
            booking__user=request.user,
            decision=TrainingBookingUpdate.STATUS_PENDING,
            seen_at__isnull=True,
        ).exists()
        return Response({'has_unseen': has_unseen})


class AdminHeaderAlertsView(APIView):
    """Сводка для колокольчика у админ-панели: новые записи / ответы клиентов / новые заказы."""
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if not (request.user.is_superuser or request.user.is_staff):
            return Response({'detail': 'Недостаточно прав.'}, status=status.HTTP_403_FORBIDDEN)

        profile, _ = Profile.objects.get_or_create(user=request.user)
        is_sup = request.user.is_superuser
        trainer_ok = is_sup or (
            request.user.is_staff and profile.role == Profile.ROLE_TRAINER
        )
        manager_ok = is_sup or (
            request.user.is_staff and profile.role == Profile.ROLE_MANAGER
        )

        def _int_param(name):
            raw = request.query_params.get(name) or '0'
            try:
                return int(raw)
            except ValueError:
                return 0

        lb = _int_param('last_booking_id')
        lu = _int_param('last_booking_update_id')
        lp = _int_param('last_purchase_id')

        bookings_payload = {
            'has_news': False,
            'max_booking_id': 0,
            'max_booking_update_id': 0,
        }
        if trainer_ok:
            max_b = TrainingBooking.objects.aggregate(m=Max('id'))['m'] or 0
            max_u = (
                TrainingBookingUpdate.objects.filter(
                    decision__in=(
                        TrainingBookingUpdate.STATUS_ACCEPTED,
                        TrainingBookingUpdate.STATUS_REJECTED,
                    )
                ).aggregate(m=Max('id'))['m']
                or 0
            )
            bookings_payload = {
                'has_news': max_b > lb or max_u > lu,
                'max_booking_id': max_b,
                'max_booking_update_id': max_u,
            }

        purchases_payload = {
            'has_news': False,
            'max_purchase_id': 0,
        }
        if manager_ok:
            max_p = PurchaseHistory.objects.aggregate(m=Max('id'))['m'] or 0
            purchases_payload = {
                'has_news': max_p > lp,
                'max_purchase_id': max_p,
            }

        return Response({'bookings': bookings_payload, 'purchases': purchases_payload})


class AdminProfileListView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        if not request.user.is_superuser:
            return Response({'detail': 'Только superuser.'}, status=status.HTTP_403_FORBIDDEN)
        profiles = (
            Profile.objects.select_related('user')
            .all()
            .order_by('user__username')
        )
        serializer = AdminProfileSerializer(profiles, many=True)
        return Response(serializer.data)


class AdminProfileDetailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def patch(self, request, pk):
        if not request.user.is_superuser:
            return Response({'detail': 'Только superuser.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            profile = Profile.objects.select_related('user').get(pk=pk)
        except Profile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(AdminProfileSerializer(profile).data)

    def delete(self, request, pk):
        if not request.user.is_superuser:
            return Response({'detail': 'Только superuser.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            profile = Profile.objects.select_related('user').get(pk=pk)
        except Profile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if profile.user.is_superuser:
            return Response({'detail': 'Нельзя удалить superuser.'}, status=status.HTTP_400_BAD_REQUEST)
        # Удаляем пользователя целиком (Profile удалится каскадом).
        profile.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PurchaseHistoryListCreateView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        purchases = PurchaseHistory.objects.filter(user=request.user).prefetch_related('status_history')
        serializer = PurchaseHistorySerializer(purchases, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = PurchaseHistorySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase = serializer.save(user=request.user)
        PurchaseStatusHistory.objects.create(purchase=purchase, status='created')
        PurchaseStatusHistory.objects.create(purchase=purchase, status='processing')
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PurchaseHistoryAdminListView(APIView):
    permission_classes = ()

    def _has_manager_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_MANAGER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Менеджер заказов".'}, status=status.HTTP_403_FORBIDDEN)

    def get(self, request):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        purchases = (
            PurchaseHistory.objects.select_related('user', 'user__profile')
            .prefetch_related('status_history')
            .all()
            .order_by('-created_at')
        )
        serializer = PurchaseHistoryAdminSerializer(purchases, many=True)
        return Response(serializer.data)


class PurchaseHistoryAdminDetailView(APIView):
    permission_classes = ()

    def _has_manager_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_MANAGER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Менеджер заказов".'}, status=status.HTTP_403_FORBIDDEN)

    def patch(self, request, pk):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        try:
            purchase = PurchaseHistory.objects.select_related('user', 'user__profile').get(pk=pk)
        except PurchaseHistory.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        prev_status = purchase.status
        serializer = PurchaseHistoryAdminSerializer(purchase, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if prev_status != purchase.status:
            PurchaseStatusHistory.objects.create(purchase=purchase, status=purchase.status)

        if prev_status != purchase.status and purchase.status == 'ready':
            profile = getattr(purchase.user, 'profile', None)
            print(
                f"[SMS] Пользователь {purchase.user.username}: "
                f"товар '{purchase.product_name}' готов к выдаче. "
                f"Сообщение отправлено на номер {getattr(profile, 'phone', '') or 'не указан'}.",
                flush=True,
            )

        return Response(PurchaseHistoryAdminSerializer(purchase).data)

    def delete(self, request, pk):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        try:
            purchase = PurchaseHistory.objects.get(pk=pk)
        except PurchaseHistory.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        purchase.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShopProductListView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        products = ShopProduct.objects.filter(is_active=True).order_by('-updated_at', '-id')
        return Response(ShopProductSerializer(products, many=True).data)


class AdminShopProductListCreateView(APIView):
    permission_classes = ()
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _has_manager_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_MANAGER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Менеджер заказов".'}, status=status.HTTP_403_FORBIDDEN)

    def get(self, request):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        products = ShopProduct.objects.all().order_by('-updated_at', '-id')
        return Response(ShopProductSerializer(products, many=True).data)

    def post(self, request):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        serializer = ShopProductSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ShopProductSerializer(product, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AdminShopProductDetailView(APIView):
    permission_classes = ()
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def _has_manager_access(self, request):
        if request.user.is_superuser:
            return True
        if not request.user.is_staff:
            return False
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return profile.role == Profile.ROLE_MANAGER

    def _forbidden_response(self):
        return Response({'detail': 'Доступ разрешён только роли "Менеджер заказов".'}, status=status.HTTP_403_FORBIDDEN)

    def patch(self, request, pk):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        try:
            product = ShopProduct.objects.get(pk=pk)
        except ShopProduct.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ShopProductSerializer(
            product, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        product.refresh_from_db()
        return Response(ShopProductSerializer(product, context={'request': request}).data)

    def delete(self, request, pk):
        if not self._has_manager_access(request):
            return self._forbidden_response()
        try:
            product = ShopProduct.objects.get(pk=pk)
        except ShopProduct.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
