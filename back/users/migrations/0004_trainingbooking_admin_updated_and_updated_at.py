from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_purchase_history'),
    ]

    operations = [
        migrations.AddField(
            model_name='trainingbooking',
            name='admin_updated',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='trainingbooking',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
