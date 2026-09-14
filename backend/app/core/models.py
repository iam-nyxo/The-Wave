from dataclasses import dataclass
from typing import Literal
from pydantic import BaseModel

@dataclass
class Candle:
    index: int
    time: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0

class MonomoveResponse(BaseModel):
    id: str
    direction: Literal["UP", "DOWN"]
    startTime: str | int
    startPrice: float
    endTime: str | int
    endPrice: float
    height: float
    durationBars: int