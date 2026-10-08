"""Pydantic V2 models and schemas for distributed game telemetry, persistence, and signaling."""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "operational"
    version: str = "0.1.0"
    active_peers: int = 0
    uptime_seconds: float = 0.0


class TelemetryPacket(BaseModel):
    client_id: str
    fps: float = Field(..., ge=0.0, le=360.0)
    frame_time_ms: float = Field(..., ge=0.0)
    draw_calls: int = Field(default=0, ge=0)
    memory_mb: float = Field(default=0.0, ge=0.0)
    dropped_frames: int = Field(default=0, ge=0)
    timestamp: float


class CloudSavePayload(BaseModel):
    slot_id: int = Field(..., ge=0, le=9)
    player_name: str
    realm: str
    playtime_seconds: int = Field(default=0, ge=0)
    compressed_payload: str
    signature: str
    timestamp: float


class BiomechanicalMetrics(BaseModel):
    session_id: str
    strike_type: str
    velocity_ms: float = Field(..., ge=0.0)
    acceleration_ms2: float = Field(..., ge=0.0)
    kinetic_force_newtons: float = Field(..., ge=0.0)
    kinetic_energy_joules: float = Field(..., ge=0.0)
    timestamp: float


class SparringSignalPacket(BaseModel):
    session_id: str
    peer_id: str
    type: str = Field(..., description="offer, answer, candidate, or pose_buffer")
    sdp: Optional[str] = None
    candidate: Optional[Dict[str, Any]] = None
    pose_buffer: Optional[List[float]] = None
    timestamp: float


class BenchmarkReport(BaseModel):
    benchmark_id: str
    compression_ratio: float
    decompression_verified: bool
    signal_filter_latency_ms: float
    fps_stability_variance: float
    timestamp: float
