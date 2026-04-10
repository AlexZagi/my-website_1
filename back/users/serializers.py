from rest_framework import serializers
from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
import re
import datetime
import os
import uuid
from .models import (
    Profile,
    TrainingBooking,
    PurchaseHistory,
    TrainingBookingUpdate,
    ShopProduct,
    WORKOUT_SCHEDULE,
    WORKOUT_TYPE_CHOICES,
)


def normalize_belarus_phone(value):
    """Приводит номер к виду +375XXXXXXXXX (9 цифр после кода страны)."""
    if value is None:
        return None
    raw = str(value).strip()
    digits_only = re.sub(r'\D', '', raw)
    if len(digits_only) == 12 and digits_only.startswith('375'):
        normalized = '+' + digits_only
    elif len(digits_only) == 11 and digits_only.startswith('80'):
        normalized = '+375' + digits_only[2:]
    elif len(digits_only) == 10 and digits_only.startswith('0'):
        normalized = '+375' + digits_only[1:]
    elif len(digits_only) == 9:
        normalized = '+375' + digits_only
    else:
        stripped = re.sub(r'[^\d+]', '', raw)
        normalized = stripped if re.fullmatch(r'\+375\d{9}', stripped) else None
    if not normalized or not re.fullmatch(r'\+375\d{9}', normalized):
        return None
    return normalized


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ('username', 'avatar', 'phone', 'date_of_birth', 'role')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        user = instance.user
        request = self.context.get('request')
        data['username'] = user.username
        data['email'] = user.email or ''
        data['first_name'] = user.first_name or ''
        data['last_name'] = user.last_name or ''
        data['phone'] = instance.phone or ''
        data['date_of_birth'] = instance.date_of_birth.isoformat() if instance.date_of_birth else None
        data['is_staff'] = request.user.is_staff if request else False
        data['is_superuser'] = request.user.is_superuser if request else False
        data['role'] = instance.role
        is_superuser = bool(request and request.user.is_superuser)
        data['can_manage_bookings'] = bool(
            request
            and (
                is_superuser
                or (request.user.is_staff and instance.role == Profile.ROLE_TRAINER)
            )
        )
        data['can_manage_store'] = bool(
            request
            and (
                is_superuser
                or (request.user.is_staff and instance.role == Profile.ROLE_MANAGER)
            )
        )
        if instance.avatar:
            request = self.context.get('request')
            if request:
                data['avatar'] = request.build_absolute_uri(instance.avatar.url)
            else:
                data['avatar'] = instance.avatar.url
        else:
            data['avatar'] = None
        return data


class ProfileUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    def update(self, instance, validated_data):
        user = instance.user
        if 'email' in validated_data:
            user.email = validated_data['email']
        if 'first_name' in validated_data:
            user.first_name = validated_data['first_name']
        if 'last_name' in validated_data:
            user.last_name = validated_data['last_name']
        user.save()
        if 'phone' in validated_data:
            instance.phone = validated_data['phone']
        if 'date_of_birth' in validated_data:
            instance.date_of_birth = validated_data['date_of_birth']
        if 'avatar' in validated_data:
            instance.avatar = validated_data['avatar']
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=True, allow_blank=False, max_length=20, trim_whitespace=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'password_confirm', 'email', 'first_name', 'last_name', 'phone')
        extra_kwargs = {'password': {'write_only': True}}

    def validate_phone(self, value):
        phone = normalize_belarus_phone(value)
        if not phone:
            raise serializers.ValidationError(
                'Номер Беларуси: после +375 должно быть 9 цифр. '
                'Можно ввести +37529…, 37529…, 8029… или 029… без пробелов.'
            )
        return phone

    def validate(self, attrs):
        password = attrs.get('password')
        password_confirm = attrs.get('password_confirm')
        if password != password_confirm:
            raise serializers.ValidationError({'password_confirm': 'Пароли не совпадают.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        phone = validated_data.pop('phone')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.phone = phone
        profile.save()
        return user

class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    default_error_messages = {
        'bad_token': ('Token is expired or invalid')
    }

    def validate(self, attrs):
        self.token = attrs['refresh']
        return attrs

    def save(self, **kwargs):
        try:
            RefreshToken(self.token).blacklist()
        except Exception as e:
            self.fail('bad_token')


class TrainingBookingSerializer(serializers.ModelSerializer):
    workout_type_display = serializers.CharField(source='get_workout_type_display', read_only=True)

    class Meta:
        model = TrainingBooking
        fields = (
            'id', 'workout_type', 'workout_type_display', 'date', 'time',
            'trainer', 'comments', 'created_at', 'updated_at', 'admin_updated'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Проверяем, что для выбранного типа тренировки эта дата и время разрешены расписанием
        workout_type = attrs.get('workout_type') or (self.instance.workout_type if self.instance else None)
        date = attrs.get('date') or (self.instance.date if self.instance else None)
        time_val = attrs.get('time') or (self.instance.time if self.instance else None)

        if workout_type and date and time_val:
            weekday = date.weekday()  # 0 = понедельник, 6 = воскресенье
            allowed_for_type = WORKOUT_SCHEDULE.get(workout_type, {})
            allowed_times = allowed_for_type.get(weekday, [])
            if time_val.strftime('%H:%M') not in allowed_times:
                raise serializers.ValidationError({
                    'time': 'На выбранный день и время эта тренировка не проводится.'
                })

            # Запрет пересечения тренировок.
            # Каждая тренировка длится 1 час 30 минут (90 минут).
            duration = datetime.timedelta(minutes=90)
            requested_start = datetime.datetime.combine(date, time_val)
            requested_end = requested_start + duration

            existing_qs = TrainingBooking.objects.filter(date=date)
            if self.instance:
                existing_qs = existing_qs.exclude(pk=self.instance.pk)

            for existing in existing_qs:
                existing_start = datetime.datetime.combine(existing.date, existing.time)
                existing_end = existing_start + duration
                if requested_start < existing_end and requested_end > existing_start:
                    raise serializers.ValidationError({
                        'time': 'Нельзя записаться на пересекающееся время. Выберите другой слот.'
                    })

        return attrs


class TrainingBookingUpdateSerializer(serializers.ModelSerializer):
    old_workout_type_display = serializers.SerializerMethodField()
    new_workout_type_display = serializers.SerializerMethodField()

    class Meta:
        model = TrainingBookingUpdate
        fields = (
            'id',
            'booking',
            'decision',
            'old_workout_type',
            'old_workout_type_display',
            'old_date',
            'old_time',
            'old_trainer',
            'old_comments',
            'new_workout_type',
            'new_workout_type_display',
            'new_date',
            'new_time',
            'new_trainer',
            'new_comments',
            'created_at',
            'seen_at',
            'responded_at',
        )
        read_only_fields = ('id', 'created_at', 'seen_at', 'responded_at', 'booking')

    def get_old_workout_type_display(self, obj):
        mapping = dict(WORKOUT_TYPE_CHOICES)
        return mapping.get(obj.old_workout_type, obj.old_workout_type)

    def get_new_workout_type_display(self, obj):
        mapping = dict(WORKOUT_TYPE_CHOICES)
        return mapping.get(obj.new_workout_type, obj.new_workout_type)


class AdminProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_staff = serializers.BooleanField(required=False)
    is_superuser = serializers.BooleanField(source='user.is_superuser', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model = Profile
        fields = (
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'phone',
            'date_of_birth',
            'avatar',
            'role',
            'is_staff',
            'is_superuser',
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Поле `is_staff` в модели относится не к Profile, а к User.
        data['is_staff'] = instance.user.is_staff
        return data

    def update(self, instance, validated_data):
        user = instance.user
        is_staff = validated_data.pop('is_staff', None)
        role = validated_data.get('role', None)

        if is_staff is not None:
            user.is_staff = is_staff
            user.save()
        if role is not None:
            instance.role = role
            instance.save()
        return instance


class AdminBookingSerializer(serializers.ModelSerializer):
    workout_type_display = serializers.CharField(source='get_workout_type_display', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    user_phone = serializers.SerializerMethodField()

    def get_user_phone(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return getattr(profile, 'phone', '') if profile else ''

    class Meta:
        model = TrainingBooking
        fields = (
            'id', 'user', 'user_username', 'workout_type', 'workout_type_display',
            'date', 'time', 'trainer', 'comments', 'created_at', 'updated_at', 'admin_updated', 'user_phone',
        )
        read_only_fields = ('id', 'created_at')


class PurchaseHistorySerializer(serializers.ModelSerializer):
    status_timeline = serializers.SerializerMethodField()
    manager_phone = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseHistory
        fields = (
            'id',
            'product_id',
            'product_name',
            'unit_price',
            'quantity',
            'total_price',
            'full_name',
            'phone',
            'address',
            'comment',
            'status',
            'status_timeline',
            'manager_phone',
            'created_at',
        )
        read_only_fields = ('id', 'created_at', 'status')

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Количество должно быть не меньше 1.')
        return value

    def get_status_timeline(self, obj):
        timeline = [
            {'status': 'created', 'changed_at': obj.created_at},
            {'status': 'processing', 'changed_at': obj.created_at},
            {'status': 'ready', 'changed_at': None},
            {'status': 'delivered', 'changed_at': None},
            {'status': 'cancelled', 'changed_at': None},
        ]
        history_rows = list(obj.status_history.all())
        history_map = {row.status: row.changed_at for row in history_rows}
        for step in timeline:
            if step['status'] in history_map:
                step['changed_at'] = history_map[step['status']]
        # Если запись была создана до внедрения истории, используем created_at как старт.
        if obj.status in ('ready', 'delivered') and not history_map.get('processing'):
            timeline[1]['changed_at'] = obj.created_at
        return timeline

    def get_manager_phone(self, obj):
        # Контакт менеджера для уточнения вопросов по отмене/статусу заказа.
        manager_profile = (
            Profile.objects.select_related('user')
            .filter(role=Profile.ROLE_MANAGER, user__is_staff=True)
            .exclude(phone='')
            .order_by('id')
            .first()
        )
        return manager_profile.phone if manager_profile else ''


class PurchaseHistoryAdminSerializer(serializers.ModelSerializer):
    STATUS_CHOICES = (
        ('processing', 'В обработке'),
        ('ready', 'Готово к выдаче'),
        ('delivered', 'Выдано'),
        ('cancelled', 'Отменён'),
    )

    status = serializers.ChoiceField(choices=STATUS_CHOICES)

    user_username = serializers.SerializerMethodField()
    user_phone = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseHistory
        fields = (
            'id',
            'product_id',
            'product_name',
            'unit_price',
            'quantity',
            'total_price',
            'full_name',
            'phone',
            'address',
            'comment',
            'status',
            'created_at',
            'user_username',
            'user_phone',
        )
        read_only_fields = ('id', 'created_at', 'user_username', 'user_phone')

    def get_user_username(self, obj):
        return obj.user.username if obj.user_id else ''

    def get_user_phone(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return getattr(profile, 'phone', '') if profile else ''


class ShopProductSerializer(serializers.ModelSerializer):
    image_upload = serializers.ImageField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ShopProduct
        fields = (
            'id',
            'name',
            'summary',
            'detail',
            'composition',
            'price',
            'image',
            'image_upload',
            'is_active',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_image_upload(self, value):
        if value and value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('Размер файла не больше 5 МБ.')
        return value

    def _apply_image_upload(self, validated_data):
        upload = validated_data.pop('image_upload', None)
        if not upload:
            return
        request = self.context.get('request')
        ext = os.path.splitext(getattr(upload, 'name', '') or '')[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png', '.gif', '.webp'):
            ext = '.jpg'
        fname = f'{uuid.uuid4().hex}{ext}'
        path = default_storage.save(f'shop_products/{fname}', ContentFile(upload.read()))
        file_url = default_storage.url(path)
        if request:
            validated_data['image'] = request.build_absolute_uri(file_url)
        else:
            base = getattr(settings, 'BACKEND_PUBLIC_URL', '') or ''
            validated_data['image'] = (base.rstrip('/') + file_url) if base else file_url

    def create(self, validated_data):
        self._apply_image_upload(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._apply_image_upload(validated_data)
        return super().update(instance, validated_data)
