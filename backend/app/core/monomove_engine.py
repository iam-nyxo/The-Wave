from typing import List
from app.core.models import Candle

class MonomoveEngine:
    def __init__(self, pivot_depth: int = 2):
        self.pivot_depth = pivot_depth

    def extract_monomoves(self, candles: List[Candle]):
        if len(candles) < (self.pivot_depth * 2 + 1):
            return []

        pivots = []
        for i in range(self.pivot_depth, len(candles) - self.pivot_depth):
            current = candles[i]
            
            is_high = all(current.high > candles[i - j].high and current.high > candles[i + j].high 
                          for j in range(1, self.pivot_depth + 1))
            is_low = all(current.low < candles[i - j].low and current.low < candles[i + j].low 
                         for j in range(1, self.pivot_depth + 1))

            if is_high:
                pivots.append((i, "HIGH", current.high, current.time))
            elif is_low:
                pivots.append((i, "LOW", current.low, current.time))

        if not pivots:
            return []

        filtered_pivots = [pivots[0]]
        for p in pivots[1:]:
            prev_p = filtered_pivots[-1]
            if p[1] == prev_p[1]:
                if p[1] == "HIGH" and p[2] > prev_p[2]:
                    filtered_pivots[-1] = p
                elif p[1] == "LOW" and p[2] < prev_p[2]:
                    filtered_pivots[-1] = p
            else:
                filtered_pivots.append(p)

        class InternalMonomove:
            def __init__(self, m_id, direction, start_idx, end_idx, start_t, end_t, start_p, end_p, p_len, t_dur):
                self.id = m_id
                self.direction = direction
                self.start_index = start_idx
                self.end_index = end_idx
                self.start_time = start_t
                self.end_time = end_t
                self.start_price = start_p
                self.end_price = end_p
                self.price_length = p_len
                self.time_duration = t_dur

        monomoves = []
        for i in range(len(filtered_pivots) - 1):
            p1 = filtered_pivots[i]
            p2 = filtered_pivots[i + 1]

            direction = "UP" if p2[2] > p1[2] else "DOWN"
            price_length = abs(p2[2] - p1[2])
            time_duration = p2[0] - p1[0]

            monomove = InternalMonomove(
                m_id=i + 1,
                direction=direction,
                start_idx=p1[0],
                end_idx=p2[0],
                start_t=p1[3],
                end_t=p2[3],
                start_p=p1[2],
                end_p=p2[2],
                p_len=round(price_length, 2),
                t_dur=time_duration
            )
            monomoves.append(monomove)

        return monomoves