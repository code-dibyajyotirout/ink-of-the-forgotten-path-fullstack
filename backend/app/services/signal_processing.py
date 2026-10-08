"""Server-side OneEuroFilter implementation for telemetry validation and remote pose smoothing."""

import math
import time
from typing import Optional, Dict, Any


class LowPassFilter:
    def __init__(self, alpha: float = 0.5, init_val: Optional[float] = None):
        self.alpha = max(1e-4, min(1.0, alpha))
        self.s = init_val

    def filter(self, val: float) -> float:
        if self.s is None:
            self.s = val
            return val
        self.s = self.alpha * val + (1.0 - self.alpha) * self.s
        return self.s

    def filter_with_alpha(self, val: float, alpha: float) -> float:
        self.alpha = max(1e-4, min(1.0, alpha))
        return self.filter(val)

    def last(self) -> float:
        return self.s if self.s is not None else 0.0

    def reset(self) -> None:
        self.s = None


class ServerOneEuroFilter:
    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007, d_cutoff: float = 1.0):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self.d_cutoff = d_cutoff

        self.x_filter = LowPassFilter()
        self.dx_filter = LowPassFilter()
        self.last_time: Optional[float] = None

    def _alpha(self, cutoff: float, dt: float) -> float:
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def filter(self, val: float, timestamp: Optional[float] = None) -> float:
        t = timestamp if timestamp is not None else time.time()

        if self.last_time is None:
            self.last_time = t
            return self.x_filter.filter(val)

        dt = max(t - self.last_time, 1e-5)
        self.last_time = t

        prev_val = self.x_filter.last()
        d_val = (val - prev_val) / dt
        ed_val = self.dx_filter.filter_with_alpha(d_val, self._alpha(self.d_cutoff, dt))

        cutoff = self.min_cutoff + self.beta * abs(ed_val)
        return self.x_filter.filter_with_alpha(val, self._alpha(cutoff, dt))

    def reset(self) -> None:
        self.x_filter.reset()
        self.dx_filter.reset()
        self.last_time = None
