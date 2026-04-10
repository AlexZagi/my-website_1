from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_purchasehistory_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='role',
            field=models.CharField(
                choices=[('manager', 'Менеджер заказов'), ('trainer', 'Тренер')],
                default='trainer',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='PurchaseStatusHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('created', 'Оформлен'), ('processing', 'В обработке'), ('ready', 'Готово к выдаче'), ('delivered', 'Выдано')], max_length=30)),
                ('changed_at', models.DateTimeField(auto_now_add=True)),
                ('purchase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='status_history', to='users.purchasehistory')),
            ],
            options={
                'ordering': ['changed_at'],
            },
        ),
    ]
