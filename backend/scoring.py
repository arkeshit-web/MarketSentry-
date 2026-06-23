import pandas as pd
import numpy as np
import yfinance as yf
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scoring")

def calculate_vix_score(vix_value):
    """
    Computes VIX score (max 5 points) based on India VIX level.
    Lower VIX = calmer market, more bullish.
    Higher VIX = high fear, potential short-term selloff.
    """
    if vix_value is None or np.isnan(vix_value):
        return 3 # Default neutral
    
    if vix_value <= 13.0:
        return 5
    elif vix_value <= 16.0:
        return 4
    elif vix_value <= 20.0:
        return 2
    else:
        return 1

def calculate_technical_score(df):
    """
    Computes technical score (max 35 points):
    - RSI (max 10 points)
    - MACD (max 15 points)
    - EMA 9/21 alignment (max 10 points)
    """
    if df is None or len(df) < 2:
        return 17, {} # default neutral
        
    latest = df.iloc[-1]
    prev = df.iloc[-2]
    
    # 1. RSI Scoring (Max 10)
    # RSI around 45-65 is strong uptrend (momentum).
    # RSI < 30 is oversold (potential reversal).
    # RSI > 70 is overbought (potentially overstretched).
    rsi = latest.get('RSI', 50)
    rsi_score = 5
    rsi_signal = "Neutral"
    
    if np.isnan(rsi):
        rsi = 50
        
    if 45 <= rsi <= 65:
        rsi_score = 10
        rsi_signal = "Strong Bullish Momentum"
    elif 30 <= rsi < 45:
        # Check if rising or falling
        prev_rsi = prev.get('RSI', 40)
        if rsi > prev_rsi:
            rsi_score = 8
            rsi_signal = "Recovering from Oversold"
        else:
            rsi_score = 6
            rsi_signal = "Moderate Bearish Momentum"
    elif rsi < 30:
        rsi_score = 8 # Reversal buy signal
        rsi_signal = "Oversold - Potential Buy Reversal"
    elif 65 < rsi <= 75:
        rsi_score = 6
        rsi_signal = "Approaching Overbought"
    else: # rsi > 75
        rsi_score = 3
        rsi_signal = "Overbought - Risk of Pullback"
        
    # 2. MACD Scoring (Max 15)
    # MACD Line crossing above Signal Line = Bullish crossover (15 points).
    # MACD Line > Signal Line but narrowing = Bullish but weakening (12 points).
    # MACD Line < Signal Line but histogram increasing = Bearish but recovering (5 points).
    # MACD Line < Signal Line and histogram decreasing = Bearish trend (0 points).
    macd = latest.get('MACD', 0)
    signal = latest.get('MACD_Signal', 0)
    hist = latest.get('MACD_Hist', 0)
    
    prev_macd = prev.get('MACD', 0)
    prev_signal = prev.get('MACD_Signal', 0)
    prev_hist = prev.get('MACD_Hist', 0)
    
    macd_score = 7
    macd_signal = "Neutral"
    
    if not (np.isnan(macd) or np.isnan(signal) or np.isnan(hist)):
        # Check for crossover
        if macd > signal:
            if prev_macd <= prev_signal:
                macd_score = 15
                macd_signal = "Bullish MACD Crossover (Buy)"
            else:
                if hist >= prev_hist:
                    macd_score = 12
                    macd_signal = "Bullish Trend Widening"
                else:
                    macd_score = 9
                    macd_signal = "Bullish Trend Weakening"
        else: # macd <= signal
            if prev_macd > prev_signal:
                macd_score = 2
                macd_signal = "Bearish MACD Crossover (Sell)"
            else:
                if hist >= prev_hist:
                    macd_score = 6
                    macd_signal = "Bearish Trend Weakening (Recovering)"
                else:
                    macd_score = 0
                    macd_signal = "Strong Bearish Trend"
                    
    # 3. EMA 9/21 Scoring (Max 10)
    # Price > EMA 9 > EMA 21 = Strong Uptrend (10 pts)
    # Price < EMA 9 < EMA 21 = Strong Downtrend (0 pts)
    close = latest.get('Close', 0)
    ema9 = latest.get('EMA9', 0)
    ema21 = latest.get('EMA21', 0)
    
    ema_score = 5
    ema_signal = "Neutral"
    
    if not (np.isnan(close) or np.isnan(ema9) or np.isnan(ema21)):
        if close > ema9 and ema9 > ema21:
            ema_score = 10
            ema_signal = "Bullish Alignment (Price > EMA9 > EMA21)"
        elif close < ema9 and ema9 < ema21:
            ema_score = 0
            ema_signal = "Bearish Alignment (Price < EMA9 < EMA21)"
        elif close > ema9 and ema9 <= ema21:
            ema_score = 7
            ema_signal = "Bullish Breakout Attempt (Price > EMA9)"
        elif close < ema9 and ema9 > ema21:
            ema_score = 4
            ema_signal = "Pullback in Uptrend (Price < EMA9)"
            
    total_tech = rsi_score + macd_score + ema_score
    details = {
        "rsi_value": round(float(rsi), 2),
        "rsi_score": rsi_score,
        "rsi_signal": rsi_signal,
        "macd_value": round(float(macd), 2),
        "macd_signal_value": round(float(signal), 2),
        "macd_hist_value": round(float(hist), 2),
        "macd_score": macd_score,
        "macd_signal": macd_signal,
        "ema9_value": round(float(ema9), 2),
        "ema21_value": round(float(ema21), 2),
        "ema_score": ema_score,
        "ema_signal": ema_signal,
        "total": total_tech
    }
    
    return total_tech, details

def calculate_volume_score(df):
    """
    Computes volume momentum (max 5 points).
    Rising volume on price gains = strong buyer conviction.
    """
    if df is None or len(df) < 20:
        return 3 # Default neutral
        
    latest = df.iloc[-1]
    
    close_change = latest['Close'] - df.iloc[-2]['Close']
    vol_mean_20 = df['Volume'].rolling(20).mean().iloc[-1]
    curr_volume = latest['Volume']
    
    if np.isnan(vol_mean_20) or vol_mean_20 == 0:
        return 3
        
    volume_ratio = curr_volume / vol_mean_20
    
    if close_change > 0:
        if volume_ratio > 1.25:
            return 5 # Bullish breakout on high volume
        elif volume_ratio > 1.0:
            return 4 # Bullish gain on average-plus volume
        else:
            return 3 # Low volume gain (low conviction)
    else:
        if volume_ratio > 1.25:
            return 0 # Distribution / high volume selloff
        elif volume_ratio > 1.0:
            return 1 # Bearish volume selling
        else:
            return 2 # Calm pullback
            
def get_vix_value():
    """Fetches the latest India VIX closing price."""
    try:
        # India VIX is ticker '^INDIAVIX' on Yahoo Finance
        vix = yf.Ticker("^INDIAVIX")
        vix_history = vix.history(period="5d")
        if not vix_history.empty:
            latest_vix = vix_history['Close'].iloc[-1]
            return float(latest_vix)
    except Exception as e:
        logger.error(f"Error fetching India VIX: {e}")
    return None

def compute_composite_score(df, ml_prob, avg_sentiment, vix_val=None):
    """
    Aggregates indicators into the 100-point scoring model:
    S_Total = W_tech (35) + W_ml (30) + W_sent (25) + W_vol (10)
    """
    # 1. Technical Analysis Score (Max 35)
    tech_score, tech_details = calculate_technical_score(df)
    
    # 2. AI Machine Learning Score (Max 30)
    ml_score = round(30.0 * ml_prob)
    
    # 3. Sentiment Score (Max 25)
    # Maps avg_sentiment (-1.0 to 1.0) to (0 to 25)
    sent_score = round(25.0 * (avg_sentiment + 1.0) / 2.0)
    
    # 4. Volatility & Breadth Score (Max 10)
    if vix_val is None:
        vix_val = get_vix_value()
    vix_points = calculate_vix_score(vix_val)
    volume_points = calculate_volume_score(df)
    vol_score = vix_points + volume_points
    
    total_score = tech_score + ml_score + sent_score + vol_score
    
    # Clip just in case
    total_score = max(0, min(100, total_score))
    
    return {
        "composite_score": total_score,
        "breakdown": {
            "technical": {
                "score": tech_score,
                "max": 35,
                "details": tech_details
            },
            "ml": {
                "score": ml_score,
                "max": 30,
                "probability": round(ml_prob, 3),
                "signal": "BUY / INCREASE" if ml_prob > 0.50 else "SELL / DECREASE"
            },
            "sentiment": {
                "score": sent_score,
                "max": 25,
                "avg_sentiment": round(avg_sentiment, 3),
                "label": "Bullish" if avg_sentiment > 0.15 else "Bearish" if avg_sentiment < -0.15 else "Neutral"
            },
            "volatility": {
                "score": vol_score,
                "max": 10,
                "vix_value": round(vix_val, 2) if vix_val else None,
                "vix_score": vix_points,
                "volume_score": volume_points
            }
        }
    }
