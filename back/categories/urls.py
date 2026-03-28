from rest_framework import routers
from .api import CategorieViewset

router = routers.DefaultRouter()
router.register('categories', CategorieViewset, 'categories')

urlpatterns = router.urls
