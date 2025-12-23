from django.urls import path
from . import views

urlpatterns = [
    path('', views.StockListView.as_view(), name='stock-list'),
    path('<str:ticker>/', views.StockDetailView.as_view(), name='stock-detail'),
    path('api/compare/', views.compare_stocks, name='stock-compare'),
    path('setup/ingest/', views.ingest_data_view, name='ingest-data'),
]
