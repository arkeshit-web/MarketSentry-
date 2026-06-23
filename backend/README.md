---
title: MarketSentry API
emoji: 🛡️
colorFrom: indigo
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# MarketSentry 2.0 API Server

This is the FastAPI backend service for MarketSentry 2.0, running Python ML trend classifiers, news sentiment streams (FinBERT/lexicon), and the 100-point composite scoring algorithm.

## Local Development
Run with:
```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
