"""
Database Engine and Session Configuration.
Supports enterprise PostgreSQL (Supabase / Neon / Local / Render)
with seamless fallback to SQLite for zero-config local development.
"""

import os
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import Generator

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables from .env file
load_dotenv(PROJECT_ROOT / ".env")

# Read DATABASE_URL from environment
raw_db_url = os.getenv("DATABASE_URL", "").strip()


# Handle SQLAlchemy 1.4+ compatibility for 'postgres://' URLs from Render / Supabase
if raw_db_url.startswith("postgres://"):
    raw_db_url = raw_db_url.replace("postgres://", "postgresql://", 1)

if raw_db_url:
    logger.info("Configuring enterprise PostgreSQL database engine...")
    DATABASE_URL = raw_db_url
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False
    )
else:
    sqlite_path = DATA_DIR / "mplads_master.db"
    logger.info(f"DATABASE_URL not detected. Falling back to local SQLite at {sqlite_path}")
    DATABASE_URL = f"sqlite:///{sqlite_path}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_context():
    """Context manager for background tasks and CLI scripts."""
    return SessionLocal()
