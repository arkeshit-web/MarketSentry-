from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
import os
import json
import time
import traceback
import math

from database import init_db, save_stock_to_cache, get_cached_stocks, get_cached_stock_detail, set_metadata, get_metadata
from ml_model import train_prediction_model, get_features_and_target
from sentiment import scrape_stock_news
from scoring import compute_composite_score, get_vix_value

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(title="MarketSentry 2.0 API", version="2.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "traceback": tb_str
        }
    )

def sanitize_json_data(data):
    """Recursively converts NaN, Infinity, and -Infinity values in nested structures to None/null for JSON compatibility."""
    if isinstance(data, dict):
        return {k: sanitize_json_data(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_json_data(x) for x in data]
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            return None
        return data
    else:
        return data

def get_current_ist_time():
    """Returns the current datetime in Indian Standard Time (IST)."""
    # Hugging Face runs in UTC/GMT, so we add 5 hours and 30 minutes to UTC time
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    return ist_now

# Nifty 50 stocks mapping
NIFTY_50_STOCKS = {
    "RELIANCE.NS": "Reliance Industries Ltd.",
    "TCS.NS": "Tata Consultancy Services Ltd.",
    "HDFCBANK.NS": "HDFC Bank Ltd.",
    "INFY.NS": "Infosys Ltd.",
    "ICICIBANK.NS": "ICICI Bank Ltd.",
    "HINDUNILVR.NS": "Hindustan Unilever Ltd.",
    "SBIN.NS": "State Bank of India",
    "BHARTIALRT.NS": "Bharti Airtel Ltd.",
    "ITC.NS": "ITC Ltd.",
    "LT.NS": "Larsen & Toubro Ltd.",
    "KOTAKBANK.NS": "Kotak Mahindra Bank Ltd.",
    "AXISBANK.NS": "Axis Bank Ltd.",
    "TATAMOTORS.NS": "Tata Motors Ltd.",
    "M&M.NS": "Mahindra & Mahindra Ltd.",
    "ASIANPAINT.NS": "Asian Paints Ltd.",
    "MARUTI.NS": "Maruti Suzuki India Ltd.",
    "TITAN.NS": "Titan Company Ltd.",
    "SUNPHARMA.NS": "Sun Pharmaceutical Industries Ltd.",
    "ULTRACEMCO.NS": "UltraTech Cement Ltd.",
    "BAJFINANCE.NS": "Bajaj Finance Ltd.",
    "NESTLEIND.NS": "Nestle India Ltd.",
    "POWERGRID.NS": "Power Grid Corporation of India Ltd.",
    "NTPC.NS": "NTPC Ltd.",
    "TATASTEEL.NS": "Tata Steel Ltd.",
    "COALINDIA.NS": "Coal India Ltd.",
    "ADANIPORTS.NS": "Adani Ports & SEZ Ltd.",
    "ADANIENT.NS": "Adani Enterprises Ltd.",
    "HCLTECH.NS": "HCL Technologies Ltd.",
    "ONGC.NS": "Oil & Natural Gas Corporation Ltd.",
    "JSWSTEEL.NS": "JSW Steel Ltd.",
    "GRASIM.NS": "Grasim Industries Ltd.",
    "HINDALCO.NS": "Hindalco Industries Ltd.",
    "LTIM.NS": "LTIMindtree Ltd.",
    "DIVISLAB.NS": "Divi's Laboratories Ltd.",
    "CIPLA.NS": "Cipla Ltd.",
    "APOLLOHOSP.NS": "Apollo Hospitals Enterprise Ltd.",
    "SBILIFE.NS": "SBI Life Insurance Company Ltd.",
    "HDFCLIFE.NS": "HDFC Life Insurance Company Ltd.",
    "BAJAJFINSV.NS": "Bajaj Finserv Ltd.",
    "WIPRO.NS": "Wipro Ltd.",
    "TECHM.NS": "Tech Mahindra Ltd.",
    "BRITANNIA.NS": "Britannia Industries Ltd.",
    "INDUSINDBK.NS": "IndusInd Bank Ltd.",
    "EICHERMOT.NS": "Eicher Motors Ltd.",
    "HEROMOTOCO.NS": "Hero MotoCorp Ltd.",
    "DRREDDY.NS": "Dr. Reddy's Laboratories Ltd.",
    "TATACONSUM.NS": "Tata Consumer Products Ltd.",
    "BAJAJ-AUTO.NS": "Bajaj Auto Ltd.",
    "BPCL.NS": "Bharat Petroleum Corporation Ltd.",
    "SHRIRAMFIN.NS": "Shriram Finance Ltd."
}

# Sync lock and status tracking
sync_lock = threading.Lock()
sync_status = {
    "is_syncing": False,
    "progress": 0,
    "total": len(NIFTY_50_STOCKS),
    "current_stock": "",
    "error": None,
    "last_synced_at": ""
}

def background_sync_scheduler():
    """Asynchronous background loop that updates Nifty 50 database cache every 10 minutes."""
    # Settle down for 30s after startup
    time.sleep(30)
    while True:
        logger.info("Scheduler loop: Triggering automatic real-time sync for Nifty 50...")
        try:
            run_sync_pipeline()
        except Exception as e:
            logger.error(f"Error in scheduler sync: {e}")
        # Sleep for 10 minutes
        time.sleep(600)

@app.on_event("startup")
def startup_event():
    init_db()
    # Check if database has stocks cached. If completely empty, seed mock/initial data
    # to make sure UI works instantly, then trigger a background sync.
    cached = get_cached_stocks()
    if len(cached) == 0:
        logger.info("Database empty on startup. Seeding initial data...")
        seed_initial_database()
        # Seed done
    else:
        logger.info(f"Database contains {len(cached)} cached stocks. Ready.")
        
    # Start the 10-minute autonomic live sync loop
    threading.Thread(target=background_sync_scheduler, daemon=True).start()

def seed_initial_database():
    """Seeds database with placeholder values so dashboard loads immediately on first run."""
    init_time = get_current_ist_time().strftime("%Y-%m-%d %H:%M:%S")
    for index, (ticker, name) in enumerate(NIFTY_50_STOCKS.items()):
        # Generate semi-random initial scores and mock sparkline data
        base_score = 50 + (index % 30) - (index % 15)
        # Mock sparkline history
        history = [round(1000 + (index * 20) + (x * 5) + (x % 3 * 10), 2) for x in range(15)]
        detailed = {
            "price_history": history,
            "technical_indicators": {
                "rsi_value": 52.3,
                "rsi_signal": "Neutral Momentum",
                "macd_value": 2.4,
                "macd_signal_value": 1.9,
                "macd_hist_value": 0.5,
                "macd_signal": "Bullish Crossover",
                "ema9_value": history[-1] * 0.99,
                "ema21_value": history[-1] * 0.98,
                "ema_signal": "Bullish Alignment"
            },
            "ml_prediction": {
                "probability": 0.58,
                "signal": "BUY / INCREASE",
                "accuracy": 0.62,
                "engine": "RandomForest (Seeded)"
            },
            "sentiment": {
                "avg_sentiment": 0.25,
                "label": "Bullish",
                "engine": "Lexicon (Seeded)"
            },
            "news": [
                {
                    "title": f"Initial Seed: {name} shows stable performance",
                    "source": "MarketSentry Index",
                    "pubDate": init_time,
                    "link": "https://finance.yahoo.com",
                    "score": 0.25,
                    "label": "Positive"
                }
            ],
            "volatility": {
                "vix_value": 14.50,
                "vix_score": 4,
                "volume_score": 4
            }
        }
        
        save_stock_to_cache(
            ticker=ticker,
            name=name,
            price=history[-1],
            change_pct=0.85,
            score=base_score,
            tech=int(base_score * 0.35),
            ml=int(base_score * 0.30),
            sent=int(base_score * 0.25),
            vol=int(base_score * 0.10),
            history=history,
            detailed=detailed
        )
    set_metadata("last_sync_time", init_time)

def update_single_stock(ticker, name, vix_val=None):
    """Downloads yfinance data, runs ML & sentiment, computes 100-pt score, and caches."""
    try:
        # 1. Fetch yfinance prices
        df_clean, latest_features, full_df = get_features_and_target(ticker, period="1y")
        if full_df is None or full_df.empty:
            logger.warning(f"No history found for {ticker}")
            return False
            
        latest = full_df.iloc[-1]
        prev = full_df.iloc[-2] if len(full_df) > 1 else latest
        
        price = float(latest['Close'])
        prev_price = float(prev['Close'])
        change_pct = float(((price - prev_price) / prev_price) * 100) if prev_price > 0 else 0.0
        
        # Sparkline data (last 15 closes)
        sparkline_prices = full_df['Close'].tail(15).round(2).tolist()
        
        # 2. Run ML Model
        ml_results = train_prediction_model(ticker)
        ml_prob = ml_results["probability"]
        
        # 3. Fetch News & Sentiment
        news_results = scrape_stock_news(name, ticker)
        avg_sentiment = news_results["avg_sentiment"]
        
        # 4. Compute composite score
        scoring_results = compute_composite_score(full_df, ml_prob, avg_sentiment, vix_val)
        
        comp_score = scoring_results["composite_score"]
        breakdown = scoring_results["breakdown"]
        
        # Package detailed data
        detailed_data = {
            "price_history": full_df['Close'].tail(30).round(2).tolist(),
            "dates": [d.strftime("%Y-%m-%d") for d in full_df.index[-30:]],
            "technical_indicators": breakdown["technical"]["details"],
            "ml_prediction": {
                "probability": ml_prob,
                "signal": breakdown["ml"]["signal"],
                "accuracy": ml_results["accuracy"],
                "feature_importances": ml_results.get("feature_importances", []),
                "engine": ml_results["engine"]
            },
            "sentiment": {
                "avg_sentiment": avg_sentiment,
                "label": breakdown["sentiment"]["label"],
                "engine": news_results["engine"]
            },
            "news": news_results["news"],
            "volatility": breakdown["volatility"]
        }
        
        save_stock_to_cache(
            ticker=ticker,
            name=name,
            price=round(price, 2),
            change_pct=round(change_pct, 2),
            score=comp_score,
            tech=breakdown["technical"]["score"],
            ml=breakdown["ml"]["score"],
            sent=breakdown["sentiment"]["score"],
            vol=breakdown["volatility"]["score"],
            history=sparkline_prices,
            detailed=detailed_data
        )
        return True
    except Exception as e:
        logger.error(f"Failed to update stock {ticker}: {e}", exc_info=True)
        return False

def run_sync_pipeline():
    """Background task to sync all Nifty 50 stocks in parallel."""
    global sync_status
    if not sync_lock.acquire(blocking=False):
        logger.info("Sync already in progress. Skipping.")
        return
        
    try:
        logger.info("Starting Nifty 50 sync pipeline...")
        sync_status["is_syncing"] = True
        sync_status["progress"] = 0
        sync_status["error"] = None
        
        # Fetch current India VIX once to share among stocks
        vix_val = get_vix_value()
        if vix_val is None:
            vix_val = 14.0 # default fallback
            
        success_count = 0
        # Use ThreadPoolExecutor to fetch 5 stocks concurrently
        with ThreadPoolExecutor(max_workers=5) as executor:
            future_to_ticker = {
                executor.submit(update_single_stock, ticker, name, vix_val): ticker 
                for ticker, name in NIFTY_50_STOCKS.items()
            }
            
            for future in as_completed(future_to_ticker):
                ticker = future_to_ticker[future]
                sync_status["current_stock"] = ticker
                try:
                    success = future.result()
                    if success:
                        success_count += 1
                except Exception as exc:
                    logger.error(f"{ticker} generated an exception: {exc}")
                
                sync_status["progress"] += 1
                
        sync_status["last_synced_at"] = get_current_ist_time().strftime("%Y-%m-%d %H:%M:%S")
        set_metadata("last_sync_time", sync_status["last_synced_at"])
        logger.info(f"Sync complete. Successfully updated {success_count}/{len(NIFTY_50_STOCKS)} stocks.")
    except Exception as e:
        logger.error(f"Sync pipeline crashed: {e}")
        sync_status["error"] = str(e)
    finally:
        sync_status["is_syncing"] = False
        sync_status["current_stock"] = ""
        sync_lock.release()

@app.get("/api/stocks")
def get_stocks():
    """Returns cached list of stocks for main dashboard."""
    stocks = get_cached_stocks()
    last_sync = get_metadata("last_sync_time", "Never")
    return sanitize_json_data({
        "stocks": stocks,
        "last_sync": last_sync,
        "sync_status": {
            "is_syncing": sync_status["is_syncing"],
            "progress": sync_status["progress"],
            "total": sync_status["total"]
        }
    })

@app.get("/api/stocks/{ticker}")
def get_stock_detail(ticker: str):
    """Returns cached stock details. If not cached, fetches live data immediately."""
    ticker = ticker.upper()
    if ticker not in NIFTY_50_STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found in Nifty 50 index.")
        
    cached_detail = get_cached_stock_detail(ticker)
    
    # If not found or details are outdated (e.g. mock seeded data), fetch live details
    if not cached_detail or "Seeded" in str(cached_detail.get("detailed", {}).get("ml_prediction", {}).get("engine", "")):
        logger.info(f"Detail cache miss/seeded for {ticker}. Fetching live...")
        success = update_single_stock(ticker, NIFTY_50_STOCKS[ticker])
        if success:
            cached_detail = get_cached_stock_detail(ticker)
            
    if not cached_detail:
        raise HTTPException(status_code=500, detail="Failed to fetch stock details.")
        
    return sanitize_json_data(cached_detail)

@app.post("/api/stocks/sync")
def trigger_sync(background_tasks: BackgroundTasks):
    """Triggers background sync pipeline."""
    if sync_status["is_syncing"]:
        return {"message": "Synchronization already in progress.", "status": sync_status}
        
    background_tasks.add_task(run_sync_pipeline)
    return {"message": "Sync started in background.", "status": sync_status}

@app.get("/api/sync/status")
def get_sync_status():
    """Returns the progress of the background synchronization."""
    return sanitize_json_data(sync_status)

@app.get("/api/market-status")
def get_market_status():
    """Returns general Nifty 50 index status and India VIX."""
    vix = get_vix_value()
    
    nifty_price = 23500.0
    nifty_change = 0.0
    
    try:
        # Fetch Nifty 50 index info (^NSEI)
        nifty = yf.Ticker("^NSEI")
        nifty_df = nifty.history(period="5d")
        if nifty_df is not None and not nifty_df.empty:
            nifty_df = nifty_df.dropna(subset=['Close'])
        if nifty_df is not None and not nifty_df.empty:
            nifty_price = float(nifty_df['Close'].iloc[-1])
            prev_nifty = float(nifty_df['Close'].iloc[-2]) if len(nifty_df) > 1 else nifty_price
            nifty_change = float(((nifty_price - prev_nifty) / prev_nifty) * 100)
    except Exception as e:
        logger.error(f"Error fetching Nifty 50 index status: {e}")
        
    return sanitize_json_data({
        "nifty": {
            "price": round(nifty_price, 2) if not np.isnan(nifty_price) else 23500.0,
            "change_pct": round(nifty_change, 2) if not np.isnan(nifty_change) else 0.0
        },
        "vix": round(vix, 2) if (vix and not np.isnan(vix)) else 14.50
    })

@app.get("/api/stocks/{ticker}/intraday")
def get_stock_intraday(ticker: str):
    """
    Returns intraday price metrics (2-minute intervals) for the current active day.
    Falls back to previous day if closed, or a mock trend if yfinance is throttled.
    """
    ticker = ticker.upper()
    if ticker not in NIFTY_50_STOCKS:
        raise HTTPException(status_code=404, detail="Stock not found in Nifty 50 index.")
        
    try:
        stock = yf.Ticker(ticker)
        # Fetch 1-day history with 2-minute interval
        df = stock.history(period="1d", interval="2m")
        
        # If weekend/holiday/market-closed, fall back to last active session
        if df is None or df.empty:
            df = stock.history(period="5d", interval="5m")
            if df is not None and not df.empty:
                last_date = df.index[-1].date()
                df = df[df.index.date == last_date]
                
        if df is not None and not df.empty:
            df = df.dropna(subset=['Close'])
            
        if df is None or df.empty:
            raise Exception("No active data found")
            
        prices = df['Close'].round(2).tolist()
        times = [t.strftime("%H:%M") for t in df.index]
        
        is_up = prices[-1] >= prices[0] if len(prices) > 1 else True
        change_pct = ((prices[-1] - prices[0]) / prices[0]) * 100 if len(prices) > 1 else 0.0
        
        return sanitize_json_data({
            "ticker": ticker,
            "prices": prices,
            "times": times,
            "current_price": prices[-1],
            "change_pct": round(change_pct, 2),
            "is_up": is_up,
            "last_updated": get_current_ist_time().strftime("%H:%M:%S"),
            "fallback": False
        })
    except Exception as e:
        logger.warning(f"Failed to fetch live intraday for {ticker}: {e}. Serving safe fallback.")
        # Return fallback pattern so frontend chart is always stable
        mock_prices = [round(1800 + x * 1.5 + (x % 4 * 3), 2) for x in range(35)]
        mock_times = [f"{9 + (x // 12):02d}:{(x % 12) * 5:02d}" for x in range(35)]
        return sanitize_json_data({
            "ticker": ticker,
            "prices": mock_prices,
            "times": mock_times,
            "current_price": mock_prices[-1],
            "change_pct": 0.35,
            "is_up": True,
            "last_updated": get_current_ist_time().strftime("%H:%M:%S"),
            "fallback": True
        })

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
