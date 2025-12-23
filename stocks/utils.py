from datetime import timedelta
from django.db.models import Avg
from .models import StockPrice, NewsArticle

def calculate_health_score(stock):
    """
    Calculates a 0-100 health score for a stock.
    Rules:
    1. Trend: SMA 50 > SMA 200 (+20 points)
    2. Short Term Momentum: Price > SMA 50 (+20 points)
    3. Volume Trend: Buying pressure (+10 points)
    4. Sentiment: AI Analysis of news (+/- 10 points)
    """
    score = 40 # Base score
    
    # Fetch recent history
    prices = stock.prices.order_by('-date')
    if not prices.exists():
        return 0 # No data
        
    latest_price = prices[0].close_price
    
    # 1. Price Trend (Simple Moving Average)
    # Calculate SMA 50
    # Ideally efficient with database aggregation, but Python list slicing is fine for MVP small data
    prices_list = list(prices[:200]) # Get last 200 days
    
    if len(prices_list) >= 50:
        sma_50 = sum(p.close_price for p in prices_list[:50]) / 50
        
        # Rule: Price > SMA 50 (Bullish short term)
        if latest_price > sma_50:
            score += 20
            
    if len(prices_list) >= 200:
        sma_200 = sum(p.close_price for p in prices_list) / 200
        
        # Rule: Golden Cross (SMA 50 > SMA 200) - Long term bullish
        # We need to calculate SMA 50 for the *same* period end? No, just current state.
        # current SMA 50 (already calc) > current SMA 200
        if 'sma_50' in locals() and sma_50 > sma_200:
            score += 20
    
    # 2. Volume Trend (Buying Pressure)
    # If recent avg volume > avg volume of last month
    if len(prices_list) >= 10:
        recent_vol = sum(p.volume for p in prices_list[:5]) / 5
        past_vol = sum(p.volume for p in prices_list[5:10]) / 5
        
        if recent_vol > past_vol:
            score += 10
            
    # 3. Sentiment Analysis (AI)
    recent_news = stock.news.order_by('-published_at')[:5]
    if recent_news.exists():
        avg_sentiment = sum(n.sentiment_score for n in recent_news) / len(recent_news)
        
        if avg_sentiment > 0.2:
            score += 10
        elif avg_sentiment < -0.2:
            score -= 10
            
    # Cap score at 100
    return min(max(score, 0), 100)

