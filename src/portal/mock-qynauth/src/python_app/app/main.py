import hashlib
import logging
import secrets
import sys
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

# Add this import for redirection
from starlette.responses import RedirectResponse

sys.path.append(str(Path(__file__).parent.parent))
from pqc_ffi import PQCLibrary, PQCLibraryError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="QynAuth MVP API",
    description="Minimal Secure Classical Authentication with Quantum-Safe Crypto Placeholder",  # noqa: E501
    version="0.1.0",
)

# In-memory user store for MVP simplicity (replace with DB later)
# Store hashed passwords, JWT tokens, and PQC keys
users_db = (
    {}
)  # { "username": {"hashed_password": "...", "salt": "...", "token": "...", "pqc_keys": {...}} }

pqc_lib = None

def get_pqc_library():
    """Get or initialize the PQC library instance."""
    global pqc_lib
    if pqc_lib is None:
        try:
            pqc_lib = PQCLibrary()
            logger.info("PQC library initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PQC library: {e}")
            pqc_lib = None
    return pqc_lib


# Pydantic models for request/response bodies
class RegisterPayload(BaseModel):
    username: str
    password: str


class LoginPayload(BaseModel):
    username: str
    password: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# New route to redirect from root to /docs
@app.get("/")
async def redirect_to_docs():
    return RedirectResponse(url="/docs")


@app.get("/health", response_model=dict)
async def health_check():
    """
    Health check endpoint.
    Returns:
        dict: A simple status message.
    """
    logger.info("Health check requested.")
    return {"status": "ok", "message": "QynAuth API is running!"}


@app.post(
    "/auth/register",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(payload: RegisterPayload):
    """
    Registers a new user with a username and password.
    Returns a simple JWT token (placeholder for quantum-safe token).
    """
    username = payload.username
    password = payload.password

    if username in users_db:
        logger.warning(f"Registration attempt for existing user: {username}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered",  # noqa: E501
        )

    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash the password with the salt
    hashed_password = hashlib.sha256(
        (password + salt).encode("utf-8")
    ).hexdigest()  # noqa: E501

    # Generate a simple placeholder JWT token (for MVP simplicity)
    # In a real app, this would be a properly signed JWT or quantum-safe token
    jwt_token = f"dummy_jwt_for_{username}_{secrets.token_hex(16)}"

    users_db[username] = {
        "hashed_password": hashed_password,
        "salt": salt,
        "token": jwt_token,
    }

    # Generate quantum-safe keys using FFI interface
    pqc_keys = {}
    try:
        pqc_library = get_pqc_library()
        if pqc_library is None:
            logger.warning(f"PQC library not available, skipping key generation for user {username}")
        else:
            logger.info(f"Generating quantum-safe keys for user {username}")
            
            # Generate ML-KEM keypair for key encapsulation
            kem_keypair = pqc_library.generate_ml_kem_keypair()
            kem_public = kem_keypair['public_key']
            kem_private = kem_keypair['private_key']
            logger.info(f"Generated ML-KEM-768 keypair for user {username}: pub_key={len(kem_public)} bytes")
            
            # Generate ML-DSA keypair for digital signatures
            dsa_keypair = pqc_library.generate_ml_dsa_keypair()
            dsa_public = dsa_keypair['public_key']
            dsa_private = dsa_keypair['private_key']
            logger.info(f"Generated ML-DSA-65 keypair for user {username}: pub_key={len(dsa_public)} bytes")
            
            pqc_keys = {
                "ml_kem": {
                    "public_key": kem_public,
                    "private_key": kem_private,
                    "algorithm": "ML-KEM-768"
                },
                "ml_dsa": {
                    "public_key": dsa_public,
                    "private_key": dsa_private,
                    "algorithm": "ML-DSA-65"
                }
            }
            
            logger.info(f"Successfully generated and stored PQC keys for user {username}")
            
    except PQCLibraryError as e:
        logger.error(f"PQC library error during key generation for user {username}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error during PQC key generation for user {username}: {e}")

    users_db[username] = {
        "hashed_password": hashed_password,
        "salt": salt,
        "token": jwt_token,
        "pqc_keys": pqc_keys
    }

    logger.info(f"User {username} registered successfully with PQC keys.")

    return AuthTokenResponse(access_token=jwt_token, token_type="bearer")


@app.post("/auth/login", response_model=AuthTokenResponse)
async def login(payload: LoginPayload):
    """
    Authenticates a user and returns a JWT token (placeholder for quantum-safe token).  # noqa: E501
    """
    username = payload.username
    password = payload.password

    user_data = users_db.get(username)

    if not user_data:
        logger.warning(f"Login attempt for non-existent user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",  # noqa: E501
        )

    stored_hashed_password = user_data["hashed_password"]
    stored_salt = user_data["salt"]

    # Hash the provided password with the stored salt for comparison
    provided_hashed_password = hashlib.sha256(
        (password + stored_salt).encode("utf-8")
    ).hexdigest()

    if provided_hashed_password != stored_hashed_password:
        logger.warning(
            f"Login attempt with incorrect password for user: {username}"
        )  # noqa: E501
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",  # noqa: E501
        )

    logger.info(f"User {username} logged in successfully.")
    return AuthTokenResponse(
        access_token=user_data["token"], token_type="bearer"
    )  # noqa: E501
