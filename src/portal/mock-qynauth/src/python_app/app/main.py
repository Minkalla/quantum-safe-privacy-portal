from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
import secrets
import hashlib
import subprocess  # For quantum-safe crypto placeholder
import json
import logging

# Add this import for redirection
from starlette.responses import RedirectResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="QynAuth MVP API",
    description="Minimal Secure Classical Authentication with Quantum-Safe Crypto Placeholder",
    version="0.1.0",
)

# In-memory user store for MVP simplicity (replace with DB later)
# Store hashed passwords and associated JWT tokens
users_db = (
    {}
)  # { "username": {"hashed_password": "...", "salt": "...", "token": "..."} }


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
            status_code=status.HTTP_409_CONFLICT, detail="Username already registered"
        )

    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash the password with the salt
    hashed_password = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()

    # Generate a simple placeholder JWT token (for MVP simplicity)
    # In a real app, this would be a properly signed JWT or quantum-safe token
    jwt_token = f"dummy_jwt_for_{username}_{secrets.token_hex(16)}"

    users_db[username] = {
        "hashed_password": hashed_password,
        "salt": salt,
        "token": jwt_token,
    }

    logger.info(f"User {username} registered successfully.")

    # Simulate quantum-safe key generation/exchange (placeholder call to Rust/external process)
    try:
        # For MVP, simulate a successful call
        # In real scenario, this would call out to Rust via FFI, e.g., using python-rust-fastapi binding or direct FFI
        # As per handover, robust subprocess simulation in main.py for MVP
        # Example: subprocess.run(['./rust_lib_executable', 'generate_keys'], check=True, capture_output=True)
        logger.info(f"Simulating quantum-safe key generation for user {username}")
        # Ensure the path to the Rust executable is correct relative to where the FastAPI app runs
        # The rust_lib executable needs to be built and accessible
        # For MVP, we'll just log success

        # Placeholder for future quantum-safe crypto bridge
        # Example using a subprocess call:
        # rust_exec_path = "../rust_lib/target/debug/rust_lib" # Adjust path based on your build output
        # result = subprocess.run([rust_exec_path, "generate_keys", username], capture_output=True, text=True, check=True)
        # logger.info(f"Quantum-safe key generation simulation result: {result.stdout.strip()}")
        pass  # Placeholder for actual subprocess call
    except FileNotFoundError:
        logger.error(
            "Rust executable not found for quantum-safe key generation. Ensure it's built and path is correct."
        )
    except subprocess.CalledProcessError as e:
        logger.error(
            f"Error during quantum-safe key generation simulation: {e.stderr.strip()}"
        )
    except Exception as e:
        logger.error(
            f"Unexpected error during quantum-safe key generation simulation: {e}"
        )

    return AuthTokenResponse(access_token=jwt_token, token_type="bearer")


@app.post("/auth/login", response_model=AuthTokenResponse)
async def login(payload: LoginPayload):
    """
    Authenticates a user and returns a JWT token (placeholder for quantum-safe token).
    """
    username = payload.username
    password = payload.password

    user_data = users_db.get(username)

    if not user_data:
        logger.warning(f"Login attempt for non-existent user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    stored_hashed_password = user_data["hashed_password"]
    stored_salt = user_data["salt"]

    # Hash the provided password with the stored salt for comparison
    provided_hashed_password = hashlib.sha256(
        (password + stored_salt).encode("utf-8")
    ).hexdigest()

    if provided_hashed_password != stored_hashed_password:
        logger.warning(f"Login attempt with incorrect password for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    logger.info(f"User {username} logged in successfully.")
    return AuthTokenResponse(access_token=user_data["token"], token_type="bearer")
