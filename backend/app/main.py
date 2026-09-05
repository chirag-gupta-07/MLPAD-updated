"""
FastAPI Application Entry Point for MPLADS Risk Intelligence Platform.
Mounts all REST routers, CORS middleware, and health check endpoints.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.app.api.works import router as works_router
from backend.app.api.risk import router as risk_router
from backend.app.api.map import router as map_router
from backend.app.api.upload import router as upload_router
from backend.app.api.assistant import router as assistant_router
from backend.app.api.citizen_evidence import router as citizen_evidence_router
from backend.app.api.lifecycle import router as lifecycle_router
from backend.app.services.citizen_evidence_service import seed_demo_citizen_evidence
from backend.app.db.seed_scenarios import seed_demo_scenarios
from fastapi.staticfiles import StaticFiles
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed initial demo evidence & lifecycle scenarios if DB empty
    seed_demo_citizen_evidence()
    seed_demo_scenarios()
    yield
    # Shutdown logic if any

app = FastAPI(
    title="MPLADS AI Risk Intelligence Platform API",
    description="MoSPI / DIID Smart India Hackathon 2026 (SIH26102) - Decision Support System for Detecting Anomalies and Inefficiencies in MPLADS Scheme Implementation.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend running on localhost:5173 / localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for citizen evidence photographs
uploads_dir = Path(r"C:\Users\kavit\Installation\SIH 2026\data\citizen_evidence\uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/evidence", StaticFiles(directory=str(uploads_dir)), name="evidence_uploads")

# Include Routers
app.include_router(works_router)
app.include_router(risk_router)
app.include_router(map_router)
app.include_router(upload_router)
app.include_router(assistant_router)
app.include_router(citizen_evidence_router)
app.include_router(lifecycle_router)


@app.get("/")
def root():
    return {
        "status": "online",
        "service": "MPLADS Risk Intelligence Platform API",
        "version": "1.0.0",
        "problem_statement": "SIH26102 (MoSPI / DIID)",
        "docs_url": "/docs"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
