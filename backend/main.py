import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from app.core.monomove_engine import MonomoveEngine
from app.services.market_data_service import MarketDataService

app = FastAPI(title="The Wave - Neo Wave Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = MonomoveEngine(pivot_depth=2)

class FetchRequest(BaseModel):
    symbol: str
    timeframe: str

@app.get("/")
def root():
    return {"status": "Active", "system": "The Wave Neo-Wave Analyzer Engine"}

@app.post("/api/v1/analyze-monomoves")
def analyze_monomoves(payload: FetchRequest):
    # Live Candles direct fetch via Yahoo Finance
    candles = MarketDataService.fetch_history(symbol=payload.symbol, timeframe=payload.timeframe)
    
    if not candles:
        return {"status": "error", "message": "Failed to fetch historical market data"}

    monomoves = engine.extract_monomoves(candles)

    formatted_monomoves = []
    for m in monomoves:
        start_t = int(m.start_time) if str(m.start_time).isdigit() else m.start_time
        end_t = int(m.end_time) if str(m.end_time).isdigit() else m.end_time

        formatted_monomoves.append({
            "id": f"MV-{str(m.id).zfill(3)}",
            "direction": m.direction,
            "startTime": start_t,
            "startPrice": m.start_price,
            "endTime": end_t,
            "endPrice": m.end_price,
            "height": m.price_length,
            "durationBars": m.time_duration
        })

    chart_candles = [
        {
            "time": int(c.time),
            "open": c.open,
            "high": c.high,
            "low": c.low,
            "close": c.close
        }
        for c in candles
    ]

    return {
        "status": "success",
        "symbol": payload.symbol,
        "candles": chart_candles,
        "monomoves": formatted_monomoves
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)