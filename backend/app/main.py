"""FastAPI Application Entrypoint for Ink of the Forgotten Path."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
try:
    from app.api.router import api_router
except ImportError:
    from backend.app.api.router import api_router

app = FastAPI(
    title="Ink of the Forgotten Path - Distributed Backend",
    description="High-throughput distributed backend for 3D browser-native gaming, telemetry, and WebRTC signaling.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# Cross-Origin Resource Sharing (CORS) Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "service": "Ink of the Forgotten Path API",
        "docs": "/api/docs",
        "status": "operational",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
