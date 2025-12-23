from django.urls import path
from . import views

urlpatterns = [
    path('setup/ingest/', views.ingest_data_view, name='ingest-data'),
    path('', views.StockListView.as_view(), name='stock-list'),
    path('api/compare/', views.compare_stocks, name='stock-compare'),
    path('<str:ticker>/', views.StockDetailView.as_view(), name='stock-detail'),
]
