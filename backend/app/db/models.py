"""
SQLAlchemy Relational Models for Enterprise MPLADS Platform.
Defines Users, Works, Contractors, Tenders, Bids, and Work Orders.
"""

from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


class User(Base):
    """User account model for JWT Authentication and Role-Based Access Control."""
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(String(30), nullable=False, index=True)  # SUPER_ADMIN, MP, DISTRICT_COLLECTOR, CONTRACTOR, VIGILANCE, CITIZEN
    designation = Column(String(150), nullable=True)
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    constituency = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    contractor_profile = relationship("ContractorProfile", back_populates="user", uselist=False)


class Work(Base):
    """Core Public Works Record Model (Matches the 80K MPLADS Dataset)."""
    __tablename__ = "works"

    work_id = Column(String(100), primary_key=True, index=True)
    work_description = Column(Text, nullable=True)
    state = Column(String(100), index=True)
    district = Column(String(100), index=True)
    constituency = Column(String(150), index=True, nullable=True)
    mp_name = Column(String(150), index=True, nullable=True)
    sector = Column(String(100), index=True, nullable=True)
    category = Column(String(100), nullable=True)
    sanctioned_amount = Column(Float, default=0.0)
    total_expenditure = Column(Float, default=0.0)
    completion_percentage = Column(Float, default=0.0)
    sanction_date = Column(String(50), nullable=True)
    status = Column(String(50), default="IN_PROGRESS", index=True)
    implementing_agency = Column(String(255), index=True, nullable=True)

    # Risk & Anomaly Metrics
    composite_risk_score = Column(Float, default=25.0, index=True)
    risk_level = Column(String(20), default="LOW", index=True)
    delay_risk_score = Column(Float, default=20.0)
    financial_anomaly_score = Column(Float, default=15.0)
    utilization_anomaly_score = Column(Float, default=15.0)
    duplicate_risk_score = Column(Float, default=10.0)

    # Geospatial Coordinates
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    tenders = relationship("Tender", back_populates="work")
    work_orders = relationship("WorkOrder", back_populates="work")


class ContractorProfile(Base):
    """Verified Government Contractor & Vendor Registry."""
    __tablename__ = "contractor_profiles"

    id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.id"), nullable=True)
    firm_name = Column(String(200), nullable=False, index=True)
    license_class = Column(String(20), default="Class-B")  # Class-A, Class-B, Class-C
    pan = Column(String(20), nullable=True, index=True)
    gstin = Column(String(25), nullable=True, index=True)
    kyc_status = Column(String(20), default="ACTIVE", index=True)  # PENDING_KYC, ACTIVE, REJECTED
    contact_email = Column(String(150), nullable=True)
    contact_phone = Column(String(30), nullable=True)
    bank_name = Column(String(100), nullable=True)
    bank_account_no = Column(String(50), nullable=True)
    bank_ifsc = Column(String(20), nullable=True)
    performance_score = Column(Float, default=78.5)
    total_works_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="contractor_profile")
    bids = relationship("Bid", back_populates="contractor")
    work_orders = relationship("WorkOrder", back_populates="contractor")


class Tender(Base):
    """Notice Inviting Tender (NIT) for Approved Works."""
    __tablename__ = "tenders"

    id = Column(String(50), primary_key=True, index=True)
    work_id = Column(String(100), ForeignKey("works.work_id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    department = Column(String(100), default="Public Works Department (PWD)")
    state = Column(String(100), index=True)
    district = Column(String(100), index=True)
    constituency = Column(String(150), nullable=True)
    estimated_cost = Column(Float, nullable=False)
    emd_amount = Column(Float, nullable=False)  # Earnest Money Deposit (usually 2%)
    minimum_contractor_class = Column(String(20), default="Class-B")
    
    publication_date = Column(DateTime, default=datetime.utcnow)
    submission_deadline = Column(DateTime, nullable=False)
    technical_bid_opening_date = Column(DateTime, nullable=True)
    financial_bid_opening_date = Column(DateTime, nullable=True)
    status = Column(String(30), default="PUBLISHED", index=True)  # DRAFT, PUBLISHED, EVALUATING, AWARDED, CLOSED
    
    awarded_contractor_id = Column(String(50), ForeignKey("contractor_profiles.id"), nullable=True)
    awarded_amount = Column(Float, nullable=True)
    created_by_officer = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    work = relationship("Work", back_populates="tenders")
    bids = relationship("Bid", back_populates="tender", cascade="all, delete-orphan")
    work_orders = relationship("WorkOrder", back_populates="tender")


class Bid(Base):
    """Encrypted Two-Envelope Bids Submitted by Contractors."""
    __tablename__ = "bids"

    id = Column(String(50), primary_key=True, index=True)
    tender_id = Column(String(50), ForeignKey("tenders.id"), nullable=False, index=True)
    contractor_id = Column(String(50), ForeignKey("contractor_profiles.id"), nullable=False, index=True)
    
    # Envelope 1: Technical Bid
    technical_proposal = Column(Text, nullable=True)
    equipment_details = Column(Text, nullable=True)
    proposed_duration_days = Column(Integer, default=180)
    emd_paid = Column(Boolean, default=True)
    emd_transaction_id = Column(String(100), nullable=True)
    technical_score = Column(Float, default=80.0)
    technical_status = Column(String(30), default="QUALIFIED")  # PENDING, QUALIFIED, DISQUALIFIED

    # Envelope 2: Sealed Financial Bid
    quoted_amount = Column(Float, nullable=False)
    financial_rank = Column(String(10), nullable=True)  # L1, L2, L3...
    
    # AI Vigilance & Cartel Flags
    cartel_flags = Column(Text, nullable=True)  # JSON formatted strings of detected collusion
    submission_ip = Column(String(50), default="127.0.0.1")
    
    status = Column(String(30), default="SUBMITTED", index=True)  # SUBMITTED, SHORTLISTED, REJECTED, AWARDED_L1
    created_at = Column(DateTime, default=datetime.utcnow)

    tender = relationship("Tender", back_populates="bids")
    contractor = relationship("ContractorProfile", back_populates="bids")


class WorkOrder(Base):
    """Official Work Order Issued to Awarded L1 Contractor."""
    __tablename__ = "work_orders"

    id = Column(String(50), primary_key=True, index=True)
    tender_id = Column(String(50), ForeignKey("tenders.id"), nullable=False)
    work_id = Column(String(100), ForeignKey("works.work_id"), nullable=False, index=True)
    contractor_id = Column(String(50), ForeignKey("contractor_profiles.id"), nullable=False)
    
    sanctioned_amount = Column(Float, nullable=False)
    awarded_date = Column(DateTime, default=datetime.utcnow)
    target_completion_date = Column(DateTime, nullable=False)
    current_progress_pct = Column(Float, default=0.0)
    expenditure_disbursed = Column(Float, default=0.0)
    status = Column(String(30), default="ISSUED", index=True)  # ISSUED, IN_PROGRESS, UNDER_INSPECTION, COMPLETED, DELAYED
    created_at = Column(DateTime, default=datetime.utcnow)

    work = relationship("Work", back_populates="work_orders")
    contractor = relationship("ContractorProfile", back_populates="work_orders")
    tender = relationship("Tender", back_populates="work_orders")
