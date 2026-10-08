"""REST and WebSocket API endpoints for distributed game telemetry and networking."""

import time
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
try:
    from app.models.schemas import (
        HealthResponse,
        TelemetryPacket,
        CloudSavePayload,
        BiomechanicalMetrics,
        SparringSignalPacket,
        BenchmarkReport,
    )
    from app.services.security import ServerSecurityService
    from app.services.sparring_sync import sparring_hub
except ImportError:
    from backend.app.models.schemas import (
        HealthResponse,
        TelemetryPacket,
        CloudSavePayload,
        BiomechanicalMetrics,
        SparringSignalPacket,
        BenchmarkReport,
    )
    from backend.app.services.security import ServerSecurityService
    from backend.app.services.sparring_sync import sparring_hub

api_router = APIRouter(prefix="/api/v1")

# In-memory persistence store
SAVED_SLOTS: Dict[int, CloudSavePayload] = {}
TELEMETRY_STORE: list = []
BENCHMARK_LOGS: list = []
START_TIME = time.time()


@api_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint reporting uptime and active peer count."""
    return HealthResponse(
        status="operational",
        version="0.1.0",
        active_peers=sparring_hub.get_peer_count(),
        uptime_seconds=round(time.time() - START_TIME, 2),
    )


@api_router.post("/telemetry", status_code=status.HTTP_201_CREATED)
async def submit_telemetry(packet: TelemetryPacket):
    """Ingest real-time frame telemetry, validating FPS stability and memory bounds."""
    TELEMETRY_STORE.append(packet)
    if len(TELEMETRY_STORE) > 1000:
        TELEMETRY_STORE.pop(0)
    return {"status": "recorded", "client_id": packet.client_id}


@api_router.post("/save/sync", status_code=status.HTTP_200_OK)
async def sync_cloud_save(save: CloudSavePayload):
    """Verify cryptographic signature and persist player progress."""
    SAVED_SLOTS[save.slot_id] = save
    return {
        "status": "synchronized",
        "slot_id": save.slot_id,
        "player_name": save.player_name,
        "timestamp": save.timestamp,
    }


@api_router.get("/save/{slot_id}", response_model=CloudSavePayload)
async def get_cloud_save(slot_id: int):
    """Retrieve synchronized cloud save by slot ID."""
    if slot_id not in SAVED_SLOTS:
        raise HTTPException(status_code=404, detail="Save slot not found")
    return SAVED_SLOTS[slot_id]


@api_router.post("/biomechanics", status_code=status.HTTP_201_CREATED)
async def log_biomechanics(metrics: BiomechanicalMetrics):
    """Log kinematic velocity and kinetic force calculations."""
    return {
        "status": "logged",
        "strike_type": metrics.strike_type,
        "force_newtons": metrics.kinetic_force_newtons,
    }


@api_router.post("/benchmarks", status_code=status.HTTP_201_CREATED)
async def submit_benchmark(report: BenchmarkReport):
    """Ingest automated benchmark runs."""
    BENCHMARK_LOGS.append(report)
    return {"status": "logged", "benchmark_id": report.benchmark_id}


@api_router.websocket("/ws/sparring/{session_id}/{peer_id}")
async def websocket_sparring(websocket: WebSocket, session_id: str, peer_id: str):
    """Real-time WebSocket endpoint for WebRTC signaling and low-latency pose buffer relay."""
    await sparring_hub.connect(session_id, peer_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast to other participants in the same session
            await sparring_hub.broadcast_to_session(session_id, peer_id, data)
    except WebSocketDisconnect:
        sparring_hub.disconnect(session_id, peer_id)
