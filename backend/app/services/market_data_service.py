import pandas as pd
import yfinance as yf
from typing import List
from app.core.models import Candle

SYMBOL_MAP = {
    "NAS100": "^NDX",
    "US30": "^DJI",
    "XAUUSD": "GC=F"
}

TF_MAP = {
    "1M": "1m",
    "5M": "5m",
    "15M": "15m",
    "1H": "60m",
    "4H": "1h",
    "1D": "1d",
    "8D": "8d",
    "1m": "1mo",   # 1 Month
    "12M": "1y"   # 12 Months / 1 Year
}

class MarketDataService:
    @staticmethod
    def fetch_history(symbol: str = "NAS100", timeframe: str = "15M") -> List[Candle]:
        ticker_symbol = SYMBOL_MAP.get(symbol, "^NDX")
        interval = TF_MAP.get(timeframe, "15m")
        
        # Determine Period based on Timeframe Limits in Yahoo Finance
        if interval == "1m":
            period = "7d"
        elif interval in ["5m", "15m"]:
            period = "60d"
        else:
            period = "max"   # FULL ALL HISTORY for 1H, 4H, 1D, 8D, 1M, 12M
        
        df = yf.download(tickers=ticker_symbol, period=period, interval=interval, progress=False)
        
        if df.empty:
            return []

        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df = df.reset_index()
        candles: List[Candle] = []
        
        date_col = 'Datetime' if 'Datetime' in df.columns else 'Date'

        for idx, row in df.iterrows():
            dt_val = row[date_col]
            
            if hasattr(dt_val, 'timestamp'):
                time_val = int(dt_val.timestamp())
            else:
                time_val = int(pd.to_datetime(dt_val).timestamp())

            open_p = float(row['Open'])
            high_p = float(row['High'])
            low_p = float(row['Low'])
            close_p = float(row['Close'])
            vol_p = float(row['Volume']) if 'Volume' in row and not pd.isna(row['Volume']) else 0.0

            candles.append(Candle(
                index=idx,
                time=str(time_val),
                open=round(open_p, 2),
                high=round(high_p, 2),
                low=round(low_p, 2),
                close=round(close_p, 2),
                volume=round(vol_p, 2)
            ))
            
        return candles