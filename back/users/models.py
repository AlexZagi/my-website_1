from django.db import models
from django.conf import settings


class Profile(models.Model):
    ROLE_MANAGER = 'manager'
    ROLE_TRAINER = 'trainer'
    ROLE_CHOICES = [
        (ROLE_MANAGER, 'Менеджер заказов'),
        (ROLE_TRAINER, 'Тренер'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_TRAINER)

    def __str__(self):
        return f'Profile of {self.user.username}'


WORKOUT_TYPE_CHOICES = [
    ('cardio', 'Кардио-тренировки'),
    ('strength', 'Силовые тренировки'),
    ('yoga', 'Йога и растяжка'),
    ('functional', 'Функциональные тренировки'),
    ('gymnastics', 'Гимнастика'),
    ('pilates', 'Пилатес'),
    ('crossfit', 'Кроссфит'),
    ('aqua', 'Аквааэробика'),
]

# Расписание по дням недели (0 = понедельник, 6 = воскресенье)
# Для каждого типа тренировки указаны допустимые времена в конкретные дни.
# Шаблон повторяется каждую неделю:
# - Пн, Ср, Пт: утренний блок базовых тренировок
# - Вт, Чт, Сб: утренний блок дополнительных тренировок
# - Вс: без занятий
WORKOUT_SCHEDULE = {
    'cardio': {
        0: ['09:00', '10:30', '12:00', '15:00', '16:30', '18:00'],  # Пн
        2: ['09:00', '10:30', '12:00', '15:30', '17:00'],  # Ср
        4: ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30', '19:00'],  # Пт
    },
    'strength': {
        0: ['09:30', '11:30', '13:30', '15:00', '16:30', '18:00'],
        2: ['10:30', '12:00', '13:30', '15:00', '17:30'],
        4: ['10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'],
    },
    'yoga': {
        0: ['12:00', '13:30', '15:00', '16:30'],
        2: ['12:00', '13:30', '15:00', '16:30'],
        4: ['12:00', '13:30', '15:00', '16:30'],
    },
    'functional': {
        0: ['13:30', '15:00', '16:30'],
        2: ['13:30', '15:00', '16:30'],
        4: ['13:30', '15:00', '16:30'],
    },
    'gymnastics': {
        1: ['09:00', '10:30', '12:00', '13:30'],  # Вт
        3: ['09:00', '10:30', '12:00', '13:30'],  # Чт
        5: ['09:00', '10:30', '12:00', '13:30'],  # Сб
    },
    'pilates': {
        1: ['10:30', '12:00', '13:30', '15:00'],
        3: ['10:30', '12:00', '13:30', '15:00'],
        5: ['10:30', '12:00', '13:30', '15:00'],
    },
    'crossfit': {
        1: ['12:00', '13:30', '15:00', '16:30'],
        3: ['12:00', '13:30', '15:00', '16:30'],
        5: ['12:00', '13:30', '15:00', '16:30'],
    },
    'aqua': {
        1: ['13:30', '15:00', '16:30', '18:00'],
        3: ['13:30', '15:00', '16:30', '18:00'],
        5: ['13:30', '15:00', '16:30', '18:00'],
    },
}


class TrainingBooking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='training_bookings')
    workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPE_CHOICES)
    date = models.DateField()
    time = models.TimeField()
    trainer = models.CharField(max_length=100, blank=True)
    comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    admin_updated = models.BooleanField(default=False)

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f'{self.user.username} — {self.get_workout_type_display()} {self.date}'


class PurchaseHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='purchase_history')
    product_id = models.CharField(max_length=120, blank=True)
    product_name = models.CharField(max_length=255)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    comment = models.TextField(blank=True)
    # Статус выдачи товара администратором
    status = models.CharField(max_length=30, default='processing')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username} — {self.product_name} x{self.quantity}'


class PurchaseStatusHistory(models.Model):
    STATUS_CHOICES = [
        ('created', 'Оформлен'),
        ('processing', 'В обработке'),
        ('ready', 'Готово к выдаче'),
        ('delivered', 'Выдано'),
        ('cancelled', 'Отменён'),
    ]

    purchase = models.ForeignKey(PurchaseHistory, on_delete=models.CASCADE, related_name='status_history')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['changed_at']

    def __str__(self):
        return f'#{self.purchase_id} -> {self.status}'


class TrainingBookingUpdate(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Ожидает решения'),
        (STATUS_ACCEPTED, 'Принято'),
        (STATUS_REJECTED, 'Отклонено'),
    ]

    decision = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)

    booking = models.ForeignKey(
        'TrainingBooking',
        on_delete=models.CASCADE,
        related_name='booking_updates',
    )

    # Снимок "до" изменения админом
    old_workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPE_CHOICES)
    old_date = models.DateField()
    old_time = models.TimeField()
    old_trainer = models.CharField(max_length=100, blank=True)
    old_comments = models.TextField(blank=True)

    # Снимок "после" изменения админом
    new_workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPE_CHOICES)
    new_date = models.DateField()
    new_time = models.TimeField()
    new_trainer = models.CharField(max_length=100, blank=True)
    new_comments = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    seen_at = models.DateTimeField(null=True, blank=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Booking update #{self.id} ({self.decision})'


class ShopProduct(models.Model):
    name = models.CharField(max_length=255)
    summary = models.CharField(max_length=350, blank=True)
    detail = models.TextField(blank=True)
    composition = models.CharField(max_length=500, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image = models.CharField(max_length=500, blank=True)  # URL or static path (e.g. /img/icons/1.jpg)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.name
