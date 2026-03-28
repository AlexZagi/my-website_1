from django.db import models
from django.conf import settings


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)

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
        0: ['09:00','18:00'],  # Пн
        2: ['09:00','16:00'],  # Ср
        4: ['09:00','19:00'],  # Пт
    },
    'strength': {
        0: ['11:30','15:00'],
        2: ['10:30','17:30'],
        4: ['10:30','21:00'],
    },
    'yoga': {
        0: ['12:00'],
        2: ['12:00'],
        4: ['12:00'],
    },
    'functional': {
        0: ['13:30'],
        2: ['13:30'],
        4: ['13:30'],
    },
    'gymnastics': {
        1: ['09:00'],  # Вт
        3: ['09:00'],  # Чт
        5: ['09:00'],  # Сб
    },
    'pilates': {
        1: ['10:30'],
        3: ['10:30'],
        5: ['10:30'],
    },
    'crossfit': {
        1: ['12:00'],
        3: ['12:00'],
        5: ['12:00'],
    },
    'aqua': {
        1: ['13:30'],
        3: ['13:30'],
        5: ['13:30'],
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

    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f'{self.user.username} — {self.get_workout_type_display()} {self.date}'
