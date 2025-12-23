from django.db import models
from django.contrib.auth.models import User

class Stock(models.Model):
    ticker = models.CharField(max_length=20, primary_key=True)
    company_name = models.CharField(max_length=255)
    sector = models.CharField(max_length=100, blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.ticker} - {self.company_name}"

class StockPrice(models.Model):
    ticker = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='prices')
    date = models.DateField()
    open_price = models.DecimalField(max_digits=12, decimal_places=2)
    close_price = models.DecimalField(max_digits=12, decimal_places=2)
    volume = models.BigIntegerField()

    class Meta:
        unique_together = ('ticker', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.ticker} - {self.date}"

class Financial(models.Model):
    ticker = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='financials')
    quarter = models.CharField(max_length=20)  # e.g., "Q3 2024"
    revenue = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    net_profit = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)
    debt = models.DecimalField(max_digits=15, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"{self.ticker} - {self.quarter}"

class Watchlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    ticker = models.ForeignKey(Stock, on_delete=models.CASCADE)
    alert_price = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - {self.ticker}"

class NewsArticle(models.Model):
    ticker = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='news')
    headline = models.CharField(max_length=500)
    url = models.URLField(blank=True, null=True)
    sentiment_score = models.FloatField(default=0.0) # -1.0 to 1.0
    published_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return f"{self.ticker} - {self.headline[:50]}..."

