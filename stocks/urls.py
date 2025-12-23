from django.urls import path
from . import views

urlpatterns = [
    path('', views.StockListView.as_view(), name='stock-list'),
    path('<str:ticker>/', views.StockDetailView.as_view(), name='stock-detail'),
    path('api/compare/', views.compare_stocks, name='stock-compare'), # Changed slightly to avoid conflict if ticker overlaps, but cleaner: /compare?t1=X&t2=Y
]
