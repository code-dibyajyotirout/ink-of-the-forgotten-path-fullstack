"""Real-time WebRTC signaling broker and pose buffer relay channel."""

import json
from typing import Dict, Set, Any
from fastapi import WebSocket


class SparringSessionManager:
    def __init__(self):
        # Map session_id -> dict of peer_id -> WebSocket
        self.sessions: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, session_id: str, peer_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if session_id not in self.sessions:
            self.sessions[session_id] = {}
        self.sessions[session_id][peer_id] = websocket

    def disconnect(self, session_id: str, peer_id: str) -> None:
        if session_id in self.sessions:
            self.sessions[session_id].pop(peer_id, None)
            if not self.sessions[session_id]:
                del self.sessions[session_id]

    async def broadcast_to_session(self, session_id: str, sender_peer_id: str, message: Dict[str, Any]) -> None:
        if session_id not in self.sessions:
            return
        payload = json.dumps(message)
        for peer_id, ws in self.sessions[session_id].items():
            if peer_id != sender_peer_id:
                try:
                    await ws.send_text(payload)
                except Exception:
                    pass

    def get_peer_count(self) -> int:
        return sum(len(peers) for peers in self.sessions.values())


sparring_hub = SparringSessionManager()
