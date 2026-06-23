import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "marketsentry.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS stock_cache (
            ticker TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL,
            change_pct REAL,
            score INTEGER,
            tech_score INTEGER,
            ml_score INTEGER,
            sent_score INTEGER,
            vol_score INTEGER,
            history_json TEXT,
            detailed_data_json TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create metadata table for general stats
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_stock_to_cache(ticker, name, price, change_pct, score, tech, ml, sent, vol, history, detailed):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO stock_cache (
            ticker, name, price, change_pct, score, 
            tech_score, ml_score, sent_score, vol_score, 
            history_json, detailed_data_json, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(ticker) DO UPDATE SET
            price = excluded.price,
            change_pct = excluded.change_pct,
            score = excluded.score,
            tech_score = excluded.tech_score,
            ml_score = excluded.ml_score,
            sent_score = excluded.sent_score,
            vol_score = excluded.vol_score,
            history_json = excluded.history_json,
            detailed_data_json = excluded.detailed_data_json,
            last_updated = datetime('now')
    """, (
        ticker, name, price, change_pct, score, 
        tech, ml, sent, vol, 
        json.dumps(history), json.dumps(detailed)
    ))
    conn.commit()
    conn.close()

def get_cached_stocks():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stock_cache ORDER BY score DESC")
    rows = cursor.fetchall()
    conn.close()
    
    stocks = []
    for r in rows:
        stocks.append({
            "ticker": r["ticker"],
            "name": r["name"],
            "price": r["price"],
            "change_pct": r["change_pct"],
            "score": r["score"],
            "tech_score": r["tech_score"],
            "ml_score": r["ml_score"],
            "sent_score": r["sent_score"],
            "vol_score": r["vol_score"],
            "history": json.loads(r["history_json"]) if r["history_json"] else [],
            "last_updated": r["last_updated"]
        })
    return stocks

def get_cached_stock_detail(ticker):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stock_cache WHERE ticker = ?", (ticker,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    return {
        "ticker": row["ticker"],
        "name": row["name"],
        "price": row["price"],
        "change_pct": row["change_pct"],
        "score": row["score"],
        "tech_score": row["tech_score"],
        "ml_score": row["ml_score"],
        "sent_score": row["sent_score"],
        "vol_score": row["vol_score"],
        "history": json.loads(row["history_json"]) if row["history_json"] else [],
        "detailed": json.loads(row["detailed_data_json"]) if row["detailed_data_json"] else {},
        "last_updated": row["last_updated"]
    }

def set_metadata(key, value):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO metadata (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, str(value)))
    conn.commit()
    conn.close()

def get_metadata(key, default=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM metadata WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["value"]
    return default
