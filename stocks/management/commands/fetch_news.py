import random
import feedparser
from django.core.management.base import BaseCommand
from stocks.models import Stock, NewsArticle
from stocks.sentiment import analyze_text
from django.utils import timezone

class Command(BaseCommand):
    help = 'Fetches (mocks) news and analyzes sentiment'

    def handle(self, *args, **kwargs):
        self.stdout.write("Fetching real-time news from Google RSS...")
        
        stocks = Stock.objects.all()
        if not stocks.exists():
            self.stdout.write(self.style.WARNING("No stocks found. Run ingest_data first."))
            return

        for stock in stocks:
            try:
                # RSS Feed for the specific ticker
                # We append "stock news india" to get relevant context
                query = f"{stock.company_name} stock news"
                rss_url = f"https://news.google.com/rss/search?q={query.replace(' ', '+')}&hl=en-IN&gl=IN&ceid=IN:en"
                
                feed = feedparser.parse(rss_url)
                
                if not feed.entries:
                    self.stdout.write(f"No news found for {stock.ticker}")
                    continue

                # Process top 5 articles
                count = 0
                for entry in feed.entries[:5]:
                    headline = entry.title
                    link = entry.link
                    
                    # Avoid duplicates (simple check by headline)
                    if NewsArticle.objects.filter(ticker=stock, headline=headline).exists():
                        continue
                        
                    try:
                        # Analyze Sentiment
                        score = analyze_text(headline)
                        
                        NewsArticle.objects.create(
                            ticker=stock,
                            headline=headline,
                            url=link,
                            sentiment_score=score
                        )
                        count += 1
                    except Exception as sentiment_error:
                         self.stdout.write(self.style.WARNING(f"Sentiment analysis failed for article: {sentiment_error}"))
                         continue
                
                self.stdout.write(f"Added {count} articles for {stock.ticker}")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed {stock.ticker}: {e}"))
                continue
        
        self.stdout.write(self.style.SUCCESS("Real-time news update complete."))
