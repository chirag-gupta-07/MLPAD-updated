"""
Authentication and Role-Based Access Control (RBAC) API.
Implements JWT tokens, native bcrypt password hashing, and 1-Click Persona switching for SIH demos.
"""

import os
import uuid
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.db.models import User, ContractorProfile
router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() in ("true", "1", "yes")
_raw_jwt = os.getenv("JWT_SECRET")
if not _raw_jwt:
    if not DEMO_MODE:
        raise RuntimeError("JWT_SECRET environment variable must be set in production mode.")
    JWT_SECRET = "sih2026_national_mplads_secure_jwt_token_key"
else:
    JWT_SECRET = _raw_jwt
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# Pydantic Schemas
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    role: str  # SUPER_ADMIN, MP, DISTRICT_COLLECTOR, CONTRACTOR, VIGILANCE, CITIZEN
    designation: Optional[str] = None
    state: Optional[str] = "Uttar Pradesh"
    district: Optional[str] = "Varanasi"
    constituency: Optional[str] = "Varanasi Lok Sabha"
    firm_name: Optional[str] = None
    license_class: Optional[str] = "Class-B"
    pan: Optional[str] = None
    gstin: Optional[str] = None


# Helpers
def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return plain_password == hashed_password


def get_password_hash(password: str) -> str:
    pw_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pw_bytes, bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Extracts and validates current user from JWT Bearer token."""
    raw_token = token
    if not raw_token and authorization and authorization.startswith("Bearer "):
        raw_token = authorization.split(" ")[1]

    if not raw_token:
        # Default anonymous citizen user if not logged in
        return User(
            id="anon_citizen",
            username="citizen_public",
            email="citizen@public.nic.in",
            full_name="Public Citizen (Social Auditor)",
            role="CITIZEN",
            district="Varanasi",
            state="Uttar Pradesh"
        )

    try:
        payload = jwt.decode(raw_token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return User(
            id=user_id,
            username=payload.get("username", "user"),
            email=payload.get("email", "user@mplads.gov.in"),
            full_name=payload.get("full_name", "Authorized User"),
            role=payload.get("role", "CITIZEN"),
            district=payload.get("district", "Varanasi"),
            state=payload.get("state", "Uttar Pradesh")
        )
    return user


def require_roles(allowed_roles: List[str]):
    """Decorator to enforce Role-Based Access Control."""
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}, Your role: {current_user.role}"
            )
        return current_user
    return role_checker


# Demo Personas for Quick SIH Presentation Switching
DEMO_PERSONAS = {
    "admin": {
        "id": "usr_mospi_admin",
        "username": "mospi_admin",
        "full_name": "Dr. R. K. Verma, IAS (MoSPI National Coordinator)",
        "role": "SUPER_ADMIN",
        "designation": "Director General (MPLADS Division), MoSPI",
        "email": "dg.mplads@nic.in",
        "state": "National",
        "district": "All Districts",
        "constituency": "National Overview"
    },
    "mp": {
        "id": "usr_mp_varanasi",
        "username": "honble_mp_varanasi",
        "full_name": "Hon'ble Member of Parliament (Varanasi)",
        "role": "MP",
        "designation": "Member of Parliament (Lok Sabha)",
        "email": "mp.varanasi@sansad.nic.in",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi Lok Sabha"
    },
    "dno": {
        "id": "usr_dc_varanasi",
        "username": "dc_varanasi",
        "full_name": "S. Rajalingam, IAS (District Collector & DM)",
        "role": "DISTRICT_COLLECTOR",
        "designation": "District Magistrate & Nodal Authority",
        "email": "dm.varanasi@up.gov.in",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi District"
    },
    "contractor": {
        "id": "usr_gandhi_const",
        "username": "gandhi_construction",
        "full_name": "Gandhi Construction And Supplier (R. K. Gandhi)",
        "role": "CONTRACTOR",
        "designation": "Managing Director (Class-A Enlisted Contractor)",
        "email": "contact@gandhiconstruction.in",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi",
        "firm_name": "Gandhi Construction And Supplier",
        "license_class": "Class-A"
    },
    "vigilance": {
        "id": "usr_cag_auditor",
        "username": "cag_vigilance",
        "full_name": "Amitabh Sengupta (Senior Audit Officer, CAG)",
        "role": "VIGILANCE",
        "designation": "Principal Director of Audit (Infrastructure)",
        "email": "vigilance.mplads@cag.gov.in",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi"
    },
    "citizen": {
        "id": "usr_citizen_social",
        "username": "citizen_varanasi",
        "full_name": "Priya Sharma (Citizen & Social Auditor)",
        "role": "CITIZEN",
        "designation": "Resident & RTI Activist",
        "email": "priya.sharma92@gmail.com",
        "state": "Uttar Pradesh",
        "district": "Varanasi",
        "constituency": "Varanasi Lok Sabha"
    }
}


@router.get("/personas")
def get_demo_personas():
    """Returns available demonstration personas for 1-click role switching."""
    return list(DEMO_PERSONAS.values())


@router.post("/switch-persona/{persona_key}", response_model=TokenResponse)
def switch_persona(persona_key: str, db: Session = Depends(get_db)):
    """Instantly switches logged-in persona and issues a valid signed JWT token."""
    if not DEMO_MODE:
        raise HTTPException(status_code=403, detail="Persona switching is disabled in production mode.")

    key = persona_key.lower().strip()
    if key not in DEMO_PERSONAS:
        raise HTTPException(status_code=404, detail=f"Persona '{persona_key}' not found. Available: {list(DEMO_PERSONAS.keys())}")

    p = DEMO_PERSONAS[key]
    
    # Ensure user exists in DB
    existing = db.query(User).filter(User.id == p["id"]).first()
    if not existing:
        new_user = User(
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
        db.add(new_user)
        
        # If contractor, seed profile as well
        if p["role"] == "CONTRACTOR":
            c_profile = ContractorProfile(
                id=f"cnt_{p['id']}",
                user_id=p["id"],
                firm_name=p.get("firm_name", "Gandhi Construction And Supplier"),
                license_class=p.get("license_class", "Class-A"),
                pan="AAACG1234F",
                gstin="09AAACG1234F1Z5",
                kyc_status="ACTIVE",
                contact_email=p["email"],
                contact_phone="+91 98765 43210",
                performance_score=88.5,
                total_works_completed=24
            )
            db.add(c_profile)
        db.commit()

    token_payload = {
        "sub": p["id"],
        "username": p["username"],
        "role": p["role"],
        "full_name": p["full_name"],
        "email": p["email"],
        "district": p["district"],
        "state": p["state"]
    }
    token = create_access_token(token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": p
    }


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.hashed_password):
        # In demo mode only, allow single fallback demo password
        if DEMO_MODE:
            for p in DEMO_PERSONAS.values():
                if p["username"] == req.username and req.password == "demo@sih2026":
                    return switch_persona(p["role"].lower(), db)
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token_payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "email": user.email,
        "district": user.district,
        "state": user.state
    }
    token = create_access_token(token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "designation": user.designation,
            "email": user.email,
            "district": user.district,
            "state": user.state,
            "constituency": user.constituency
        }
    }


@router.get("/me")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "designation": current_user.designation,
        "email": current_user.email,
        "district": current_user.district,
        "state": current_user.state,
        "constituency": current_user.constituency
    }


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email is already registered."
        )

    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    valid_role = req.role if req.role in ["SUPER_ADMIN", "DISTRICT_COLLECTOR", "MP", "CONTRACTOR", "VIGILANCE", "CITIZEN"] else "CITIZEN"

    new_user = User(
        id=user_id,
        username=req.username.strip(),
        email=req.email.strip(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name.strip(),
        role=valid_role,
        designation=req.designation or ("Authorized Stakeholder" if valid_role != "CITIZEN" else "Citizen Auditor"),
        state=req.state or "Uttar Pradesh",
        district=req.district or "Varanasi",
        constituency=req.constituency or "Varanasi Lok Sabha"
    )
    db.add(new_user)

    if valid_role == "CONTRACTOR":
        c_profile = ContractorProfile(
            id=f"cnt_{user_id}",
            user_id=user_id,
            firm_name=req.firm_name or f"{req.full_name} Enterprises",
            license_class=req.license_class or "Class-B",
            pan=req.pan or "AAACG1234F",
            gstin=req.gstin or "09AAACG1234F1Z5",
            kyc_status="ACTIVE",
            contact_email=req.email,
            contact_phone="+91 98765 43210",
            performance_score=85.0,
            total_works_completed=5
        )
        db.add(c_profile)

    db.commit()

    token_payload = {
        "sub": new_user.id,
        "username": new_user.username,
        "role": new_user.role,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "district": new_user.district,
        "state": new_user.state
    }
    token = create_access_token(token_payload)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "designation": new_user.designation,
            "email": new_user.email,
            "district": new_user.district,
            "state": new_user.state,
            "constituency": new_user.constituency
        }
    }

