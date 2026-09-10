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
from backend.app.api.attendance import router as attendance_router
from backend.app.api.daily_updates import router as daily_updates_router
from backend.app.api.inventory import router as inventory_router
from backend.app.api.approvals import router as approvals_router
from backend.app.api.payments_api import router as payments_router
from backend.app.api.dev_requests import router as dev_requests_router
from backend.app.api.project_detail import router as project_detail_router
from backend.app.api.auth import router as auth_router
from backend.app.api.tenders import router as tenders_router
from backend.app.api.contractors import router as contractors_router
from backend.app.db.database import engine, Base
from backend.app.services.citizen_evidence_service import seed_demo_citizen_evidence
from backend.app.db.seed_scenarios import seed_demo_scenarios
from backend.app.db.operations_db import init_operations_db
from backend.app.db.seed_operations import seed_demo_operations
from fastapi.staticfiles import StaticFiles
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

import os
from contextlib import asynccontextmanager
from backend.app.db.reset_demo import reset_all_databases_to_demo_state

@asynccontextmanager
async def lifespan(app: FastAPI):
    # If PERSIST_DATABASE is not set to true, automatically restore original presentation state
    persist = os.getenv("PERSIST_DATABASE", "false").lower() in ("true", "1", "yes")
    if not persist:
        logger.info("[DEMO MODE] Resetting databases to original presentation demo state on startup...")
        reset_all_databases_to_demo_state()
    else:
        logger.info("[PERSIST MODE] Keeping existing database state...")
        seed_demo_citizen_evidence()
        seed_demo_scenarios()
        init_operations_db()
        seed_demo_operations()

    # Pre-warm in-memory datasets, hash index, and spatial index so first user click is instant
    try:
        from backend.app.services.data_service import get_dataframe, get_risk_summary, _ensure_work_index, _ensure_spatial_index, get_map_markers
        logger.info("Pre-warming in-memory datasets and spatial index...")
        get_dataframe()
        _ensure_work_index()
        _ensure_spatial_index()
        get_risk_summary()
        get_map_markers()
        logger.info("Dataset and spatial cache warm-up complete.")
    except Exception as e:
        logger.warning(f"Cache warm-up warning: {e}")

    yield
    # Shutdown logic if any

app = FastAPI(
    title="MPLADS AI Risk Intelligence Platform API",
    description="MoSPI / DIID Smart India Hackathon 2026 (SIH26102) - Decision Support System for Detecting Anomalies and Inefficiencies in MPLADS Scheme Implementation.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS with explicit configurable allowlist
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static uploads directory for citizen evidence photographs
PROJECT_ROOT = Path(__file__).resolve().parents[2]
uploads_dir = PROJECT_ROOT / "data" / "citizen_evidence" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/evidence", StaticFiles(directory=str(uploads_dir)), name="evidence_uploads")

# Include Routers — existing
app.include_router(works_router)
app.include_router(risk_router)
app.include_router(map_router)
app.include_router(upload_router)
app.include_router(assistant_router)
app.include_router(citizen_evidence_router)
app.include_router(lifecycle_router)

# Include Routers — new operational modules
app.include_router(attendance_router)
app.include_router(daily_updates_router)
app.include_router(inventory_router)
app.include_router(approvals_router)
app.include_router(payments_router)
app.include_router(dev_requests_router)
app.include_router(project_detail_router)

# Enterprise Procurement & RBAC Routers
app.include_router(auth_router)
app.include_router(tenders_router)
app.include_router(contractors_router)




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


@app.post("/api/system/reset-demo")
def reset_demo_endpoint():
    """Wipes all test changes and resets to original presentation demo state."""
    result = reset_all_databases_to_demo_state()
    return result
