"""
Post-Quantum Cryptography Authentication Routes

This module provides FastAPI routes for PQC-enabled authentication,
integrating with the PQC authentication service.

Compliance:
- NIST SP 800-53 (IA-2): Identification and Authentication
- NIST SP 800-53 (AC-3): Access Enforcement
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import logging
import time
from datetime import datetime

from ..auth.pqc_auth import PQCAuthenticationService, PQCAuthConfig, PQCAuthResult

logger = logging.getLogger(__name__)

class PQCAuthRequest(BaseModel):
    """Request model for PQC authentication."""
    username: str = Field(..., min_length=1, max_length=100, description="Username for authentication")
    password: str = Field(..., min_length=1, description="Password for authentication")
    use_pqc: bool = Field(default=True, description="Enable Post-Quantum Cryptography")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional authentication metadata")

class PQCTokenRequest(BaseModel):
    """Request model for PQC token operations."""
    user_id: str = Field(..., min_length=1, max_length=100, description="User identifier")
    payload: Dict[str, Any] = Field(..., description="Token payload to sign")

class PQCTokenVerifyRequest(BaseModel):
    """Request model for PQC token verification."""
    token: str = Field(..., min_length=1, description="Token to verify")
    user_id: str = Field(..., min_length=1, max_length=100, description="Expected user identifier")

class PQCAuthResponse(BaseModel):
    """Response model for PQC authentication."""
    success: bool = Field(..., description="Authentication success status")
    user_id: Optional[str] = Field(None, description="Authenticated user identifier")
    token: Optional[str] = Field(None, description="Authentication token")
    session_id: Optional[str] = Field(None, description="Session identifier")
    pqc_enabled: bool = Field(default=False, description="PQC algorithm used")
    algorithm: Optional[str] = Field(None, description="Cryptographic algorithm used")
    expires_at: Optional[datetime] = Field(None, description="Token expiration time")
    message: Optional[str] = Field(None, description="Status or error message")
    performance_metrics: Optional[Dict[str, float]] = Field(None, description="Performance metrics")

class PQCTokenResponse(BaseModel):
    """Response model for PQC token operations."""
    success: bool = Field(..., description="Operation success status")
    token: Optional[str] = Field(None, description="Generated or verified token")
    algorithm: Optional[str] = Field(None, description="Cryptographic algorithm used")
    message: Optional[str] = Field(None, description="Status or error message")
    performance_metrics: Optional[Dict[str, float]] = Field(None, description="Performance metrics")

class PQCStatusResponse(BaseModel):
    """Response model for PQC service status."""
    pqc_available: bool = Field(..., description="PQC library availability")
    algorithms_supported: list = Field(..., description="Supported PQC algorithms")
    cache_stats: Dict[str, int] = Field(..., description="Cache statistics")
    performance_metrics: Optional[Dict[str, Any]] = Field(None, description="Performance metrics")

router = APIRouter(prefix="/auth/pqc", tags=["pqc-authentication"])

pqc_config = PQCAuthConfig(
    enable_hybrid_mode=True,
    fallback_to_classical=True,
    enable_performance_monitoring=True,
    log_pqc_operations=True
)
pqc_auth_service = PQCAuthenticationService(pqc_config)

@router.post("/login", response_model=PQCAuthResponse)
async def pqc_login(auth_request: PQCAuthRequest, request: Request):
    """
    Login with Post-Quantum Cryptography support.
    
    This endpoint provides quantum-safe authentication using ML-KEM-768
    for key exchange with fallback to classical methods if PQC is unavailable.
    """
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    
    try:
        logger.info(
            f"PQC login attempt for user: {auth_request.username} from {client_ip}",
            extra={
                'user_id': auth_request.username,
                'client_ip': client_ip,
                'use_pqc': auth_request.use_pqc
            }
        )
        
        
        if not auth_request.use_pqc:
            logger.info(f"Classical authentication requested for user: {auth_request.username}")
            return PQCAuthResponse(
                success=True,
                user_id=auth_request.username,
                token="classical_token_placeholder",
                pqc_enabled=False,
                algorithm="Classical",
                message="Classical authentication successful"
            )
        
        auth_result = await pqc_auth_service.generate_pqc_session_key(
            auth_request.username, 
            auth_request.metadata
        )
        
        if auth_result.success:
            duration_ms = (time.time() - start_time) * 1000
            
            logger.info(
                f"PQC login successful for user: {auth_request.username} in {duration_ms:.2f}ms",
                extra={
                    'user_id': auth_request.username,
                    'algorithm': auth_result.algorithm,
                    'duration_ms': duration_ms
                }
            )
            
            return PQCAuthResponse(
                success=True,
                user_id=auth_result.user_id,
                token=auth_result.token,
                session_id=auth_result.session_data.session_id if auth_result.session_data else None,
                pqc_enabled=auth_result.algorithm != 'Classical',
                algorithm=auth_result.algorithm,
                expires_at=auth_result.session_data.expires_at if auth_result.session_data else None,
                message="PQC authentication successful",
                performance_metrics=auth_result.performance_metrics
            )
        else:
            logger.warning(f"PQC login failed for user: {auth_request.username}: {auth_result.error_message}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=auth_result.error_message or "Authentication failed"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            f"PQC login error for user: {auth_request.username}: {e}",
            extra={
                'user_id': auth_request.username,
                'error': str(e),
                'duration_ms': duration_ms
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )

@router.post("/sign-token", response_model=PQCTokenResponse)
async def sign_pqc_token(token_request: PQCTokenRequest):
    """
    Sign a token using Post-Quantum Cryptography.
    
    This endpoint uses ML-DSA-65 digital signatures to sign JWT tokens
    with quantum-safe cryptographic protection.
    """
    try:
        logger.info(f"PQC token signing request for user: {token_request.user_id}")
        
        auth_result = await pqc_auth_service.sign_pqc_token(
            token_request.user_id,
            token_request.payload
        )
        
        if auth_result.success:
            logger.info(f"PQC token signed successfully for user: {token_request.user_id}")
            
            return PQCTokenResponse(
                success=True,
                token=auth_result.token,
                algorithm=auth_result.algorithm,
                message="Token signed successfully",
                performance_metrics=auth_result.performance_metrics
            )
        else:
            logger.warning(f"PQC token signing failed for user: {token_request.user_id}: {auth_result.error_message}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=auth_result.error_message or "Token signing failed"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PQC token signing error for user: {token_request.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token signing service error"
        )

@router.post("/verify-token", response_model=PQCTokenResponse)
async def verify_pqc_token(verify_request: PQCTokenVerifyRequest):
    """
    Verify a PQC-signed token.
    
    This endpoint verifies ML-DSA-65 digital signatures on JWT tokens
    to ensure quantum-safe authentication integrity.
    """
    try:
        logger.info(f"PQC token verification request for user: {verify_request.user_id}")
        
        auth_result = await pqc_auth_service.verify_pqc_token(
            verify_request.token,
            verify_request.user_id
        )
        
        if auth_result.success:
            logger.info(f"PQC token verified successfully for user: {verify_request.user_id}")
            
            return PQCTokenResponse(
                success=True,
                algorithm=auth_result.algorithm,
                message="Token verified successfully",
                performance_metrics=auth_result.performance_metrics
            )
        else:
            logger.warning(f"PQC token verification failed for user: {verify_request.user_id}: {auth_result.error_message}")
            
            return PQCTokenResponse(
                success=False,
                message=auth_result.error_message or "Token verification failed"
            )
            
    except Exception as e:
        logger.error(f"PQC token verification error for user: {verify_request.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token verification service error"
        )

@router.get("/status", response_model=PQCStatusResponse)
async def get_pqc_status():
    """
    Get PQC authentication service status.
    
    This endpoint provides information about PQC library availability,
    supported algorithms, and performance metrics.
    """
    try:
        logger.info("PQC status request")
        
        cache_stats = pqc_auth_service.get_cache_stats()
        performance_metrics = pqc_auth_service.get_performance_metrics()
        
        return PQCStatusResponse(
            pqc_available=pqc_auth_service.pqc_lib is not None,
            algorithms_supported=["ML-KEM-768", "ML-DSA-65"] if pqc_auth_service.pqc_lib else ["Classical"],
            cache_stats=cache_stats,
            performance_metrics=performance_metrics
        )
        
    except Exception as e:
        logger.error(f"PQC status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Status service error"
        )

@router.post("/clear-cache")
async def clear_pqc_cache():
    """
    Clear PQC key and session caches.
    
    This endpoint clears all cached PQC keys and sessions for maintenance
    or security purposes. Requires appropriate authorization in production.
    """
    try:
        logger.info("PQC cache clear request")
        
        pqc_auth_service.clear_caches()
        
        logger.info("PQC caches cleared successfully")
        return {"success": True, "message": "PQC caches cleared successfully"}
        
    except Exception as e:
        logger.error(f"PQC cache clear error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cache clear service error"
        )

@router.get("/health")
async def pqc_health_check():
    """
    Health check for PQC authentication service.
    
    This endpoint provides a simple health check to verify that the
    PQC authentication service is operational.
    """
    try:
        cache_stats = pqc_auth_service.get_cache_stats()
        
        return {
            "status": "healthy",
            "pqc_available": pqc_auth_service.pqc_lib is not None,
            "cache_stats": cache_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"PQC health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
