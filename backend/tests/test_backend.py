"""Automated test suite for backend services, endpoints, and websocket channels."""

import pytest
import time
from fastapi.testclient import TestClient
try:
    from app.main import app
    from app.services.signal_processing import ServerOneEuroFilter
    from app.services.security import ServerSecurityService
except ImportError:
    from backend.app.main import app
    from backend.app.services.signal_processing import ServerOneEuroFilter
    from backend.app.services.security import ServerSecurityService

client = TestClient(app)


def test_health_endpoint():
    """Verify system health reporting."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"
    assert data["version"] == "0.1.0"
    assert "uptime_seconds" in data


def test_telemetry_submission():
    """Test frame telemetry packet ingestion."""
    payload = {
        "client_id": "test_client_001",
        "fps": 59.8,
        "frame_time_ms": 16.71,
        "draw_calls": 42,
        "memory_mb": 184.5,
        "dropped_frames": 0,
        "timestamp": time.time(),
    }
    response = client.post("/api/v1/telemetry", json=payload)
    assert response.status_code == 201
    assert response.json()["status"] == "recorded"


def test_cloud_save_sync_and_retrieval():
    """Test saving and retrieving player progress."""
    payload = {
        "slot_id": 1,
        "player_name": "MurimScholar",
        "realm": "ocean_sanctuary",
        "playtime_seconds": 1240,
        "compressed_payload": "COMPRESSED_UTF16_DATA_BLOB",
        "signature": "a1b2c3d4",
        "timestamp": time.time(),
    }
    # Save
    post_res = client.post("/api/v1/save/sync", json=payload)
    assert post_res.status_code == 200
    assert post_res.json()["status"] == "synchronized"

    # Retrieve
    get_res = client.get("/api/v1/save/1")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["player_name"] == "MurimScholar"
    assert data["realm"] == "ocean_sanctuary"


def test_nonexistent_save_returns_404():
    """Verify 404 response for uninitialized save slot."""
    response = client.get("/api/v1/save/9")
    assert response.status_code == 404


def test_biomechanics_logging():
    """Verify biomechanical physics metric logging."""
    payload = {
        "session_id": "spar_001",
        "strike_type": "Jab",
        "velocity_ms": 7.4,
        "acceleration_ms2": 45.2,
        "kinetic_force_newtons": 189.8,
        "kinetic_energy_joules": 115.0,
        "timestamp": time.time(),
    }
    response = client.post("/api/v1/biomechanics", json=payload)
    assert response.status_code == 201
    assert response.json()["strike_type"] == "Jab"


def test_server_one_euro_filter():
    """Verify One Euro Filter smoothing mechanics."""
    oef = ServerOneEuroFilter(min_cutoff=1.0, beta=0.007)
    t = 1.0
    val1 = oef.filter(10.0, timestamp=t)
    assert val1 == 10.0

    # Add high frequency spike
    val2 = oef.filter(100.0, timestamp=t + 0.016)
    # Filtered value should be damped compared to raw spike
    assert val2 < 100.0
    assert val2 > 10.0


def test_security_xor_and_checksum():
    """Verify XOR decryption and FNV-1a checksum calculation."""
    text = "SECRET_CREDENTIAL_DATA"
    checksum = ServerSecurityService.fnv1a_checksum(text)
    assert len(checksum) == 8

    # Encrypt then decrypt
    raw_bytes = []
    key = "TestKey123"
    for i, c in enumerate(text):
        raw_bytes.append(chr(ord(c) ^ ord(key[i % len(key)])))
    
    import base64
    b64_enc = base64.b64encode("".join(raw_bytes).encode("latin1")).decode("ascii")

    ok, dec = ServerSecurityService.decrypt_payload(b64_enc, key)
    assert ok is True
    assert dec == text

    verified = ServerSecurityService.verify_packet(b64_enc, checksum, key)
    assert verified is True


def test_websocket_sparring_channel():
    """Verify WebSocket signaling and real-time buffer exchange."""
    with client.websocket_connect("/api/v1/ws/sparring/session_alpha/peer_1") as ws1:
        with client.websocket_connect("/api/v1/ws/sparring/session_alpha/peer_2") as ws2:
            test_msg = {"type": "pose_buffer", "data": [0.1, 1.2, -0.4]}
            ws1.send_json(test_msg)
            received = ws2.receive_json()
            assert received == test_msg
