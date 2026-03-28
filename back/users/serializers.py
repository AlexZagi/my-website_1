from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Profile, TrainingBooking, WORKOUT_SCHEDULE


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Profile
        fields = ('username', 'avatar', 'phone', 'date_of_birth')

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
    email = serializers.EmailField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'password', 'email', 'first_name', 'last_name')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
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
        fields = ('id', 'workout_type', 'workout_type_display', 'date', 'time', 'trainer', 'comments', 'created_at')
        read_only_fields = ('id', 'created_at')

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

        return attrs


class AdminBookingSerializer(serializers.ModelSerializer):
    workout_type_display = serializers.CharField(source='get_workout_type_display', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = TrainingBooking
        fields = (
            'id', 'user', 'user_username', 'workout_type', 'workout_type_display',
            'date', 'time', 'trainer', 'comments', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
