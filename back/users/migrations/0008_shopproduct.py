from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_alter_trainingbooking_workout_type_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShopProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('summary', models.CharField(blank=True, max_length=350)),
                ('detail', models.TextField(blank=True)),
                ('composition', models.CharField(blank=True, max_length=500)),
                ('price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('image', models.CharField(blank=True, max_length=500)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-updated_at', '-id'],
            },
        ),
    ]

