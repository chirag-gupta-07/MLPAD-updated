from fastapi import APIRouter, BackgroundTasks
from typing import Dict, Any
from backend.app.services.scheduler_service import get_sync_status, run_full_autonomous_sync_pipeline

router = APIRouter(prefix="/api/sync", tags=["Autonomous Pipeline & Scheduling"])


@router.get("/status")
def sync_status() -> Dict[str, Any]:
    """
    Returns current status of the autonomous background sync engine,
    last execution timestamp, next run schedule, and execution logs.
    """
    return get_sync_status()


@router.post("/trigger")
def trigger_sync(background_tasks: BackgroundTasks) -> Dict[str, Any]:
    """
    Manually triggers an immediate autonomous fetch, clean, feature engineering,
    ML re-scoring, and database hot-reload cycle in the background.
    """
    status = get_sync_status()
    if status["is_running"]:
        return {
            "status": "already_running",
            "message": "An autonomous sync cycle is already currently running."
        }
        
    background_tasks.add_task(run_full_autonomous_sync_pipeline)
    return {
        "status": "triggered",
        "message": "Autonomous sync cycle triggered successfully. Pipeline is executing in the background.",
        "timestamp": status["last_sync_time"]
    }
