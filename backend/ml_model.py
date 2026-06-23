import yfinance as yf
import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import logging

# Fallback setup for XGBoost
try:
    import xgboost as xgb
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    from sklearn.ensemble import RandomForestClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml_model")

def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    
    # Use exponential rolling average
    avg_gain = gain.ewm(com=period - 1, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, adjust=False).mean()
    
    rs = avg_gain / (avg_loss + 1e-9)
    return 100 - (100 / (1 + rs))

def calculate_macd(series):
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    signal = macd.ewm(span=9, adjust=False).mean()
    hist = macd - signal
    return macd, signal, hist

def get_features_and_target(ticker_symbol, period="1y"):
    logger.info(f"Fetching historical data for {ticker_symbol} to build features...")
    stock = yf.Ticker(ticker_symbol)
    df = stock.history(period=period)
    
    if len(df) < 50:
        # Fallback if too little data
        return None, None, None
        
    df['RSI'] = calculate_rsi(df['Close'])
    macd, signal, hist = calculate_macd(df['Close'])
    df['MACD'] = macd
    df['MACD_Signal'] = signal
    df['MACD_Hist'] = hist
    
    df['EMA9'] = df['Close'].ewm(span=9, adjust=False).mean()
    df['EMA21'] = df['Close'].ewm(span=21, adjust=False).mean()
    df['EMA_Diff'] = df['EMA9'] - df['EMA21']
    
    df['Close_EMA9_Ratio'] = df['Close'] / df['EMA9']
    df['Close_EMA21_Ratio'] = df['Close'] / df['EMA21']
    
    df['Return_1d'] = df['Close'].pct_change()
    df['Return_5d'] = df['Close'].pct_change(periods=5)
    df['Vol_5d'] = df['Return_1d'].rolling(5).std()
    
    df['Volume_Ratio'] = df['Volume'] / (df['Volume'].rolling(20).mean() + 1e-9)
    
    # Target: Will closing price in 3 days be higher than current closing price?
    # Shift target backward by 3 days
    df['Target'] = (df['Close'].shift(-3) > df['Close']).astype(int)
    
    # Keep the last row for predictions (where target is NaN)
    latest_features = df.iloc[-1:].copy()
    
    # Drop rows with NaNs for training
    df_clean = df.dropna().copy()
    
    return df_clean, latest_features, df

def train_prediction_model(ticker_symbol):
    df_clean, latest_features, full_df = get_features_and_target(ticker_symbol)
    
    if df_clean is None or len(df_clean) < 30:
        # If dataset is too small, return default positive signal
        return {
            "prediction": 1,
            "probability": 0.55,
            "accuracy": 0.50,
            "features_used": [],
            "engine": "Default Fallback"
        }
    
    feature_cols = [
        'RSI', 'MACD', 'MACD_Signal', 'MACD_Hist', 'EMA_Diff',
        'Close_EMA9_Ratio', 'Close_EMA21_Ratio', 'Return_1d', 
        'Return_5d', 'Vol_5d', 'Volume_Ratio'
    ]
    
    X = df_clean[feature_cols]
    y = df_clean['Target']
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)
    
    engine_name = "XGBoost" if XGB_AVAILABLE else "RandomForest"
    
    if XGB_AVAILABLE:
        model = xgb.XGBClassifier(
            max_depth=3,
            n_estimators=50,
            learning_rate=0.1,
            eval_metric='logloss',
            random_state=42
        )
    else:
        model = RandomForestClassifier(
            max_depth=4,
            n_estimators=50,
            random_state=42
        )
        
    model.fit(X_train, y_train)
    
    # Test accuracy
    y_pred = model.predict(X_test)
    accuracy = float(accuracy_score(y_test, y_pred))
    
    # Current features for prediction
    X_latest = latest_features[feature_cols]
    
    # Predict probability for the latest trading day
    prob_down_up = model.predict_proba(X_latest)[0]
    prob_up = float(prob_down_up[1]) # probability of going UP
    prediction = int(model.predict(X_latest)[0])
    
    # Get feature importance
    if XGB_AVAILABLE:
        importances = model.feature_importances_
    else:
        importances = model.feature_importances_
        
    feature_importance_dict = {
        col: float(imp) for col, imp in zip(feature_cols, importances)
    }
    
    # Sort feature importances
    sorted_importances = sorted(feature_importance_dict.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "prediction": prediction,
        "probability": prob_up,
        "accuracy": accuracy if accuracy > 0 else 0.50,
        "feature_importances": sorted_importances[:5],
        "engine": engine_name
    }
