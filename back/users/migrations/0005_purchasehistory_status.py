from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_trainingbooking_admin_updated_and_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchasehistory',
            name='status',
            field=models.CharField(default='processing', max_length=30),
        ),
    ]

