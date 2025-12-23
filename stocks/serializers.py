from rest_framework import serializers
from .models import Stock, StockPrice, Financial, Watchlist, NewsArticle
from .utils import calculate_health_score  # We will create this next

class StockPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockPrice
        fields = ['date', 'open_price', 'close_price', 'volume']

class StockSerializer(serializers.ModelSerializer):
    current_price = serializers.SerializerMethodField()
    health_score = serializers.SerializerMethodField()
    health_badge = serializers.SerializerMethodField()
    sparkline = serializers.SerializerMethodField()
    
    class Meta:
        model = Stock
        fields = ['ticker', 'company_name', 'sector', 'logo_url', 'current_price', 'health_score', 'health_badge', 'sparkline']

    def get_current_price(self, obj):
        latest_price = obj.prices.order_by('-date').first()
        return latest_price.close_price if latest_price else None

    def get_sparkline(self, obj):
        # Last 7 days for the dashboard sparkline
        qs = obj.prices.order_by('-date')[:7]
        # We need them in chronological order for the chart, so reverse the sliced list
        data = StockPriceSerializer(qs, many=True).data
        return data[::-1]

    def get_health_score(self, obj):
        return calculate_health_score(obj)

    def get_health_badge(self, obj):
        score = self.get_health_score(obj)
        if score >= 70:
            return "Strong Buy"
        elif score >= 50:
            return "Hold"
        else:
            return "Risky Sell"

class NewsArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsArticle
        fields = ['headline', 'sentiment_score', 'published_at', 'url']

class StockDetailSerializer(StockSerializer):
    prices = serializers.SerializerMethodField() # Limit history for detail view initially
    news = serializers.SerializerMethodField()

    class Meta:
        model = Stock
        fields = StockSerializer.Meta.fields + ['prices', 'news']
            
    def get_prices(self, obj):
        # Return last 30 days for the sparkline/chart default
        qs = obj.prices.order_by('-date')[:30]
        return StockPriceSerializer(qs, many=True).data

    def get_news(self, obj):
        qs = obj.news.order_by('-published_at')[:5]
        return NewsArticleSerializer(qs, many=True).data


class FinancialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Financial
        fields = '__all__'
