# urls.py in your 'store' app

from django.urls import path
from . import views

urlpatterns = [
    path('', views.store, name='shop'),  # Home page or all products
    path('<slug:category_slug>/', views.store, name='products_by_category'),  # Category page handled by 'store'
    path('<slug:category_slug>/<slug:product_slug>/', views.product_detail, name='product_detail'),  # Product detail page
]
