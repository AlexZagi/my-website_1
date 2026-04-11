from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0009_alter_purchasestatushistory_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='shopproduct',
            name='image',
            field=models.CharField(blank=True, max_length=2048),
        ),
    ]
