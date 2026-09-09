"""
High-Performance Database Seeder for Enterprise MPLADS Platform.
1. Creates all relational tables.
2. Ingests the 79,082 evaluated works from Parquet into PostgreSQL/SQLite.
3. Seeds standard User Personas (MoSPI Admin, MP, DC, Contractor, Vigilance, Citizen).
4. Seeds realistic Contractors, Tenders, and Bids for live e-procurement demonstrations.
"""

import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.db.database import engine, SessionLocal, Base
from backend.app.db.models import User, Work, ContractorProfile, Tender, Bid, WorkOrder
from backend.app.api.auth import DEMO_PERSONAS, get_password_hash

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def init_and_seed_database():
    """Initializes tables and seeds initial data."""
    logger.info("Creating database tables if not present...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 1. Seed Demo Personas
        logger.info("Seeding demonstration user accounts and personas...")
        for p in DEMO_PERSONAS.values():
            existing = db.query(User).filter(User.id == p["id"]).first()
            if not existing:
                user = User(
                    id=p["id"],
                    username=p["username"],
                    email=p["email"],
                    hashed_password=get_password_hash("demo@sih2026"),
                    full_name=p["full_name"],
                    role=p["role"],
                    designation=p["designation"],
                    state=p["state"],
                    district=p["district"],
                    constituency=p["constituency"]
                )
                db.add(user)
        db.commit()

        # 2. Seed Realistic Contractors
        logger.info("Seeding top enlisted contractors...")
        sample_contractors = [
            {
                "id": "cnt_usr_gandhi_const",
                "user_id": "usr_gandhi_const",
                "firm_name": "Gandhi Construction And Supplier",
                "license_class": "Class-A",
                "pan": "AAACG1234F",
                "gstin": "09AAACG1234F1Z5",
                "kyc_status": "ACTIVE",
                "contact_email": "contact@gandhiconstruction.in",
                "contact_phone": "+91 98765 43210",
                "performance_score": 91.2,
                "total_works_completed": 48
            },
            {
                "id": "cnt_advent_infomax",
                "user_id": None,
                "firm_name": "Advent Infomax Pvt Ltd",
                "license_class": "Class-A",
                "pan": "AAACA5678B",
                "gstin": "09AAACA5678B1Z9",
                "kyc_status": "ACTIVE",
                "contact_email": "projects@adventinfomax.com",
                "contact_phone": "+91 98111 22334",
                "performance_score": 86.4,
                "total_works_completed": 32
            },
            {
                "id": "cnt_bake_bihari",
                "user_id": None,
                "firm_name": "BAKE BIHARI TRADERS & BUILDERS",
                "license_class": "Class-B",
                "pan": "AAACB9876M",
                "gstin": "09AAACB9876M1Z1",
                "kyc_status": "ACTIVE",
                "contact_email": "bb.traders@gmail.com",
                "contact_phone": "+91 94150 11223",
                "performance_score": 79.0,
                "total_works_completed": 21
            },
            {
                "id": "cnt_shree_ram_infra",
                "user_id": None,
                "firm_name": "Shree Ram Infrastructure",
                "license_class": "Class-B",
                "pan": "AAACS4321P",
                "gstin": "09AAACS4321P1Z4",
                "kyc_status": "ACTIVE",
                "contact_email": "shreeraminfra@yahoo.co.in",
                "contact_phone": "+91 94520 88776",
                "performance_score": 64.5,
                "total_works_completed": 15
            }
        ]

        for c_data in sample_contractors:
            existing = db.query(ContractorProfile).filter(ContractorProfile.id == c_data["id"]).first()
            if not existing:
                c = ContractorProfile(**c_data)
                db.add(c)
        db.commit()

        # 3. Ingest Master Works Dataset if table is empty
        work_count = db.query(Work).count()
        logger.info(f"Current records in works table: {work_count}")

        parquet_path = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.parquet"
        if not parquet_path.exists():
            parquet_path = PROJECT_ROOT / "backend" / "app" / "db" / "master_evaluated_works.parquet"
        if not parquet_path.exists():
            parquet_path = PROJECT_ROOT / "data" / "demo" / "mplads_demo_dataset.parquet"

        if work_count < 1000 and parquet_path.exists():
            logger.info(f"Ingesting master works from {parquet_path}...")
            df = pd.read_parquet(parquet_path)
            
            # Map DataFrame columns to Work model fields
            column_mapping = {
                "work_id": "work_id",
                "work_description": "work_description",
                "state": "state",
                "district": "district",
                "constituency": "constituency",
                "mp_name": "mp_name",
                "sector": "sector",
                "category": "category",
                "sanctioned_amount": "sanctioned_amount",
                "total_expenditure": "total_expenditure",
                "completion_percentage": "completion_percentage",
                "sanction_date": "sanction_date",
                "status": "status",
                "implementing_agency": "implementing_agency",
                "composite_risk_score": "composite_risk_score",
                "risk_level": "risk_level",
                "delay_risk_score": "delay_risk_score",
                "financial_anomaly_score": "financial_anomaly_score",
                "utilization_anomaly_score": "utilization_anomaly_score",
                "duplicate_risk_score": "duplicate_risk_score",
                "latitude": "latitude",
                "longitude": "longitude"
            }
            
            df_to_insert = pd.DataFrame()
            for model_col, df_col in column_mapping.items():
                if df_col in df.columns:
                    df_to_insert[model_col] = df[df_col]
                else:
                    df_to_insert[model_col] = None

            # Handle defaults and nulls
            df_to_insert["composite_risk_score"] = df_to_insert["composite_risk_score"].fillna(20.0)
            df_to_insert["risk_level"] = df_to_insert["risk_level"].fillna("LOW")
            df_to_insert["status"] = df_to_insert["status"].fillna("IN_PROGRESS")
            df_to_insert["sanctioned_amount"] = df_to_insert["sanctioned_amount"].fillna(0.0)

            # Insert in chunks of 5000 for high efficiency
            chunk_size = 5000
            total_rows = len(df_to_insert)
            logger.info(f"Inserting {total_rows} records in chunks of {chunk_size}...")
            
            # Use SQLite or Postgres fast batch insert
            df_to_insert.to_sql("works", con=engine, if_exists="append", index=False, chunksize=chunk_size, method="multi")
            logger.info("Master works ingestion complete.")

        # 4. Seed Active Tenders and Two-Envelope Bids for Demo
        tender_count = db.query(Tender).count()
        if tender_count == 0:
            logger.info("Seeding initial active tenders and competitive bids...")
            sample_works = db.query(Work).limit(2).all()
            w1_id = sample_works[0].work_id if len(sample_works) > 0 else None
            w2_id = sample_works[1].work_id if len(sample_works) > 1 else None

            t1 = Tender(
                id="NIT/2026/UP/VAR/0042",
                work_id=w1_id,
                title="Construction of 500m Concrete Link Road and Culvert in Basantpur",
                description="Civil road construction connecting Basantpur village to State Highway with RCC culvert and drainage.",
                department="Public Works Department (PWD)",
                state="Uttar Pradesh",
                district="Varanasi",
                constituency="Varanasi Lok Sabha",
                estimated_cost=2500000.0,
                emd_amount=50000.0,
                minimum_contractor_class="Class-B",
                publication_date=datetime.utcnow() - timedelta(days=5),
                submission_deadline=datetime.utcnow() + timedelta(days=16),
                status="PUBLISHED",
                created_by_officer="S. Rajalingam, IAS (District Collector)"
            )
            t2 = Tender(
                id="NIT/2026/UP/VAR/0089",
                work_id=w2_id,
                title="Installation of 40 Integrated Solar High-Mast Streetlights in Rohania Block",
                description="Procurement, civil foundation, and installation of solar LED illumination systems with 5-year warranty.",
                department="Renewable Energy Development Agency (UPNEDA)",
                state="Uttar Pradesh",
                district="Varanasi",
                constituency="Varanasi Lok Sabha",
                estimated_cost=1800000.0,
                emd_amount=36000.0,
                minimum_contractor_class="Class-B",
                publication_date=datetime.utcnow() - timedelta(days=3),
                submission_deadline=datetime.utcnow() + timedelta(days=18),
                status="PUBLISHED",
                created_by_officer="S. Rajalingam, IAS (District Collector)"
            )
            db.add_all([t1, t2])
            db.commit()


            # Seed 3 Competitive Bids for Tender 1 to demonstrate AI L1 Ranking
            b1 = Bid(
                id="BID-VAR-001",
                tender_id=t1.id,
                contractor_id="cnt_usr_gandhi_const",
                technical_proposal="Full concrete batching plant, 3 road rollers, certified civil engineer on-site. Completion in 120 days.",
                equipment_details="2 JCB Excavators, 1 Paver, 4 Dumper Trucks.",
                proposed_duration_days=120,
                quoted_amount=2380000.0,  # 4.8% below estimate (Competitive L1)
                emd_paid=True,
                emd_transaction_id="TXN-SBI-991823",
                technical_score=91.2,
                technical_status="QUALIFIED",
                submission_ip="192.168.1.45",
                status="SUBMITTED"
            )
            b2 = Bid(
                id="BID-VAR-002",
                tender_id=t1.id,
                contractor_id="cnt_advent_infomax",
                technical_proposal="Standard PWD compliant methodology with sub-base preparation and 150mm M20 concrete slab.",
                equipment_details="1 Roller, 2 Concrete Mixers.",
                proposed_duration_days=150,
                quoted_amount=2440000.0,  # L2
                emd_paid=True,
                emd_transaction_id="TXN-HDFC-882711",
                technical_score=86.4,
                technical_status="QUALIFIED",
                submission_ip="103.21.54.12",
                status="SUBMITTED"
            )
            b3 = Bid(
                id="BID-VAR-003",
                tender_id=t1.id,
                contractor_id="cnt_bake_bihari",
                technical_proposal="Local construction crew with manual finishing and gravel sub-base.",
                equipment_details="Tractor mounted mixers.",
                proposed_duration_days=180,
                quoted_amount=2490000.0,  # L3
                emd_paid=True,
                emd_transaction_id="TXN-PNB-663412",
                technical_score=79.0,
                technical_status="QUALIFIED",
                submission_ip="103.21.54.12",  # Simulated shared IP to trigger Cartel warning!
                status="SUBMITTED"
            )
            db.add_all([b1, b2, b3])
            db.commit()

        logger.info("Database seeding completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    init_and_seed_database()
