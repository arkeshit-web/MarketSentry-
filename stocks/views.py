from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.shortcuts import get_object_or_404
from .models import Stock
from .serializers import StockSerializer, StockDetailSerializer, FinancialSerializer

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

from .utils import calculate_health_score

class StockListView(generics.ListAPIView):
    serializer_class = StockSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['ticker', 'company_name']

    def get_queryset(self):
        return Stock.objects.all()

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        ordering = request.query_params.get('ordering')
        if ordering == 'health_score':
            # Low to High (Risky Sell)
            stocks = list(queryset)
            stocks.sort(key=lambda x: calculate_health_score(x))
            queryset = stocks
        elif ordering == '-health_score':
            # High to Low (Strong Buy)
            stocks = list(queryset)
            stocks.sort(key=lambda x: calculate_health_score(x), reverse=True)
            queryset = stocks
        else:
            # Default or ticker ordering (already handled by default if set, or we set it here)
            if ordering == 'ticker':
                 queryset = queryset.order_by('ticker')
            elif ordering == '-ticker':
                 queryset = queryset.order_by('-ticker')
            # If no ordering, it might use model default or unordered. 
            # We should ensure consistent default ordering
            if not ordering and hasattr(queryset, 'order_by'):
                 queryset = queryset.order_by('ticker')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class StockDetailView(generics.RetrieveAPIView):
    queryset = Stock.objects.all()
    serializer_class = StockDetailSerializer
    lookup_field = 'ticker'

@api_view(['GET'])
def compare_stocks(request):
    """
    Compare two stocks side-by-side.
    Query params: ticker1, ticker2
    """
    t1 = request.query_params.get('ticker1')
    t2 = request.query_params.get('ticker2')
    
    if not t1 or not t2:
        return Response({"error": "Please provide ticker1 and ticker2"}, status=400)
    
    stock1 = get_object_or_404(Stock, ticker=t1)
    stock2 = get_object_or_404(Stock, ticker=t2)
    
    # Simple partial serializer just for basic comparison
    s1_data = StockDetailSerializer(stock1).data
    s2_data = StockDetailSerializer(stock2).data
    
    return Response({
        "stock1": s1_data,
        "stock2": s2_data
    })

from django.core.management import call_command

@api_view(['GET'])
def ingest_data_view(request):
    """
    Trigger data ingestion manually via URL.
    This is a workaround for lack of Shell access on free hosting.
    """
    try:
        limit = request.query_params.get('limit')
        if limit:
            call_command('ingest_data', limit=int(limit))
        else:
            call_command('ingest_data')
            
        return Response({"status": "Data ingestion complete. Check Dashboard."})
    except Exception as e:
        return Response({"error": str(e)}, status=500)
