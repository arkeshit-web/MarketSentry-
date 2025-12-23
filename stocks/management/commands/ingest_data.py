import yfinance as yf
import pandas as pd
from django.core.management.base import BaseCommand
from stocks.models import Stock, StockPrice
from django.utils import timezone
from datetime import datetime

class Command(BaseCommand):
    help = 'Ingests data for NIFTY 50 stocks'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, help='Limit number of stocks to ingest')
        parser.add_argument('--offset', type=int, help='Offset to start ingestion from')

    def handle(self, *args, **kwargs):
        # Expanded NIFTY 100 List (Top 100 by Market Cap)
        all_tickers = [
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS", "INFY.NS", "BHARTIARTL.NS", "ITC.NS", "SBIN.NS", "LICI.NS", "HINDUNILVR.NS",
            "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "HCLTECH.NS", "BAJFINANCE.NS", "ADANIENT.NS", "SUNPHARMA.NS", "MARUTE.NS", "TITAN.NS", "TATAMOTORS.NS",
            "ULTRACEMCO.NS", "ASIANPAINT.NS", "NTPC.NS", "BAJAJFINSV.NS", "POWERGRID.NS", "ONGC.NS", "M&M.NS", "TATASTEEL.NS", "ADANIGREEN.NS", "JSWSTEEL.NS",
            "COALINDIA.NS", "LTIM.NS", "SIEMENS.NS", "ADANIPORTS.NS", "PIDILITIND.NS", "SBILIFE.NS", "GRASIM.NS", "DMART.NS", "BEL.NS", "BAJAJ-AUTO.NS",
            "IOC.NS", "VBL.NS", "TECHM.NS", "DLF.NS", "HDFCLIFE.NS", "HINDALCO.NS", "BRITANNIA.NS", "INDIGO.NS", "HAL.NS", "GODREJCP.NS",
            "EICHERMOT.NS", "DIVISLAB.NS", "AMBUJACEM.NS", "CIPLA.NS", "TRENT.NS", "BPCL.NS", "DRREDDY.NS", "GAIL.NS", "TATAPOWER.NS", "ABB.NS",
            "VEDL.NS", "BANKBARODA.NS", "HAVELLS.NS", "TVSMOTOR.NS", "ADANIENSOL.NS", "HEROMOTOCO.NS", "INDUSINDBK.NS", "SHREECEM.NS", "MANKIND.NS", "JIOFIN.NS",
            "CHOLAFIN.NS", "ZYDUSLIFE.NS", "PNB.NS", "CANBK.NS", "UNITDSPR.NS", "MOTHERSON.NS", "NAUKRI.NS", "POLYCAB.NS", "LUPIN.NS", "TORNTPHARM.NS",
            "JSWENERGY.NS", "IRFC.NS", "ICICIPRULI.NS", "SBICARD.NS", "CUMMINSIND.NS", "MARICO.NS", "JINDALSTEL.NS", "BOSCHLTD.NS", "SRF.NS", "BERGEPAINT.NS",
            "COLPAL.NS", "ICICIGI.NS", "TIINDIA.NS", "ALEMBICLTD.NS", "MUTHOOTFIN.NS", "OBEROIRLTY.NS", "ALKEM.NS", "PIIND.NS", "PATANJALI.NS", "UNIONBANK.NS"
        ]

        limit = kwargs.get('limit')
        offset = kwargs.get('offset') or 0
        
        if limit:
            tickers = all_tickers[offset : offset + limit]
        else:
            tickers = all_tickers[offset:]

        for ticker_symbol in tickers:
            self.stdout.write(f"Fetching data for {ticker_symbol}...")
            
            try:
                # 1. Fetch Company Info
                ticker = yf.Ticker(ticker_symbol)
                info = ticker.info
                
                # Handle cases where info might be missing keys
                stock, created = Stock.objects.update_or_create(
                    ticker=ticker_symbol,
                    defaults={
                        'company_name': info.get('longName', ticker_symbol),
                        'sector': info.get('sector', 'Unknown'),
                        'logo_url': info.get('logo_url', '') # yfinance often doesn't give logo_url directly, might need a clearbit API or similar later
                    }
                )
                
                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created stock: {stock.company_name}"))
                else:
                    self.stdout.write(f"Updated stock: {stock.company_name}")

                # 2. Fetch History (1 Year)
                # We specifically want dates that are not already in DB to save time, but for MVP we'll just upsert carefully
                # Ideally, check last date in DB.
                
                last_price = StockPrice.objects.filter(ticker=stock).order_by('-date').first()
                start_date = "2024-01-01"
                if last_price:
                    # fetch from next day
                    start_date = last_price.date.strftime('%Y-%m-%d')
                
                history = ticker.history(start=start_date)
                
                prices_to_create = []
                for date, row in history.iterrows():
                    # Check if exists (inefficient for bulk, but good for MVP safety)
                    # convert pandas timestamp to python date
                    date_obj = date.date()
                    
                    if StockPrice.objects.filter(ticker=stock, date=date_obj).exists():
                        continue
                        
                    prices_to_create.append(StockPrice(
                        ticker=stock,
                        date=date_obj,
                        open_price=row['Open'],
                        close_price=row['Close'],
                        volume=row['Volume']
                    ))
                
                if prices_to_create:
                    StockPrice.objects.bulk_create(prices_to_create)
                    self.stdout.write(self.style.SUCCESS(f"Added {len(prices_to_create)} price records for {ticker_symbol}"))
                else:
                    self.stdout.write("No new data to add.")

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Failed to process {ticker_symbol}: {e}"))
