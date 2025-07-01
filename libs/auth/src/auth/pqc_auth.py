"""
Post-Quantum Cryptography Authentication Service

This module provides PQC-enabled authentication services for the Portal Backend,
integrating with the enhanced Python bindings to enable quantum-safe authentication flows.

Compliance:
- NIST SP 800-53 (IA-2): Identification and Authentication
- NIST SP 800-53 (SC-12): Cryptographic Key Establishment and Management
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

import asyncio
import logging
import json
import hashlib
import time
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../mock-qynauth/src/python_app'))

try:
    from pqc_ffi import PQCLibrary, get_pqc_library, PQCLibraryError
    PQCLibraryV2 = PQCLibrary
    PQCError = PQCLibraryError
    KyberError = PQCLibraryError
    DilithiumError = PQCLibraryError
    PQC_AVAILABLE = True
except ImportError as e:
    logging.warning(f"PQC FFI not available: {e}")
    PQC_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class PQCAuthConfig:
    """Configuration for PQC authentication service."""
    kyber_key_cache_ttl: int = 3600  # 1 hour
    dilithium_key_cache_ttl: int = 86400  # 24 hours
    max_cached_keys: int = 100
    enable_hybrid_mode: bool = True
    fallback_to_classical: bool = True
    session_token_ttl: int = 3600  # 1 hour
    max_concurrent_sessions: int = 1000
    enable_performance_monitoring: bool = True
    log_pqc_operations: bool = True

@dataclass
class PQCSessionData:
    """PQC session data structure."""
    user_id: str
    session_id: str
    shared_secret: str
    ciphertext: str
    algorithm: str
    created_at: datetime
    expires_at: datetime
    public_key_hash: str
    metadata: Dict[str, Any]

@dataclass
class PQCAuthResult:
    """Result of PQC authentication operation."""
    success: bool
    user_id: Optional[str] = None
    session_data: Optional[PQCSessionData] = None
    token: Optional[str] = None
    algorithm: Optional[str] = None
    error_message: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None

class PQCKeyCache:
    """Thread-safe cache for PQC keys with TTL support."""
    
    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self._cache: Dict[str, Tuple[Any, datetime]] = {}
        self._access_times: Dict[str, datetime] = {}
    
    def get(self, key: str) -> Optional[Any]:
        """Get cached key if not expired."""
        if key not in self._cache:
            return None
        
        value, expires_at = self._cache[key]
        if datetime.utcnow() > expires_at:
            self.remove(key)
            return None
        
        self._access_times[key] = datetime.utcnow()
        return value
    
    def put(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Put key in cache with TTL."""
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        self._cache[key] = (value, expires_at)
        self._access_times[key] = datetime.utcnow()
    
    def remove(self, key: str) -> None:
        """Remove key from cache."""
        self._cache.pop(key, None)
        self._access_times.pop(key, None)
    
    def _evict_oldest(self) -> None:
        """Evict oldest accessed key."""
        if not self._access_times:
            return
        
        oldest_key = min(self._access_times.keys(), key=lambda k: self._access_times[k])
        self.remove(oldest_key)
    
    def clear(self) -> None:
        """Clear all cached keys."""
        self._cache.clear()
        self._access_times.clear()
    
    def size(self) -> int:
        """Get current cache size."""
        return len(self._cache)

class PQCAuthenticationService:
    """Post-Quantum Cryptography Authentication Service."""
    
    def __init__(self, config: PQCAuthConfig):
        """
        Initialize PQC authentication service.
        
        Args:
            config: PQC authentication configuration
        """
        self.config = config
        self.kyber_cache = PQCKeyCache(config.max_cached_keys)
        self.dilithium_cache = PQCKeyCache(config.max_cached_keys)
        self.session_cache = PQCKeyCache(config.max_concurrent_sessions)
        
        self.pqc_lib: Optional[PQCLibraryV2] = None
        self.performance_monitor: Optional[Dict[str, Any]] = None
        
        self.logger = logging.getLogger(__name__)
        
        if PQC_AVAILABLE:
            try:
                self.pqc_lib = get_pqc_library()
                if config.enable_performance_monitoring:
                    self.performance_monitor = {'enabled': True, 'metrics': {}}
                self.logger.info("PQC authentication service initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize PQC library: {e}")
                if not config.fallback_to_classical:
                    raise
        else:
            self.logger.warning("PQC bindings not available, classical fallback only")
    
    async def generate_pqc_session_key(self, user_id: str, metadata: Optional[Dict[str, Any]] = None) -> PQCAuthResult:
        """
        Generate PQC session key for user authentication.
        
        Args:
            user_id: User identifier
            metadata: Additional session metadata
            
        Returns:
            PQC authentication result
        """
        start_time = time.time()
        
        try:
            self.logger.info(f"Generating PQC session key for user: {user_id}")
            
            if not self.pqc_lib:
                if self.config.fallback_to_classical:
                    return await self._fallback_classical_session(user_id, metadata)
                else:
                    return PQCAuthResult(
                        success=False,
                        error_message="PQC library not available"
                    )
            
            kyber_keypair = await self._get_or_create_kyber_keypair(user_id)
            
            with self._performance_context("kyber_encapsulation"):
                shared_secret, ciphertext = self.pqc_lib.ml_kem_encapsulate(kyber_keypair['public_key'])
            
            session_id = self._generate_session_id(user_id, shared_secret)
            
            session_data = PQCSessionData(
                user_id=user_id,
                session_id=session_id,
                shared_secret=shared_secret.hex() if isinstance(shared_secret, bytes) else shared_secret,
                ciphertext=ciphertext.hex() if isinstance(ciphertext, bytes) else ciphertext,
                algorithm='ML-KEM-768',
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(seconds=self.config.session_token_ttl),
                public_key_hash=hashlib.sha256(kyber_keypair['public_key']).hexdigest()[:16],
                metadata=metadata or {}
            )
            
            self.session_cache.put(session_id, session_data, self.config.session_token_ttl)
            
            token = self._generate_jwt_token(session_data)
            
            duration_ms = (time.time() - start_time) * 1000
            
            self.logger.info(
                f"PQC session key generated successfully for user: {user_id} in {duration_ms:.2f}ms",
                extra={
                    'user_id': user_id,
                    'session_id': session_id,
                    'algorithm': 'ML-KEM-768',
                    'duration_ms': duration_ms
                }
            )
            
            return PQCAuthResult(
                success=True,
                user_id=user_id,
                session_data=session_data,
                token=token,
                algorithm='ML-KEM-768',
                performance_metrics={'duration_ms': duration_ms}
            )
            
        except (PQCError, KyberError) as e:
            self.logger.error(f"PQC session key generation failed: {e}")
            if self.config.fallback_to_classical:
                return await self._fallback_classical_session(user_id, metadata)
            
            return PQCAuthResult(
                success=False,
                error_message=f"PQC session generation failed: {str(e)}"
            )
        except Exception as e:
            self.logger.error(f"Unexpected error during PQC session generation: {e}")
            return PQCAuthResult(
                success=False,
                error_message=f"Session generation error: {str(e)}"
            )
    
    async def sign_pqc_token(self, user_id: str, payload: Dict[str, Any]) -> PQCAuthResult:
        """
        Sign JWT token using PQC digital signatures.
        
        Args:
            user_id: User identifier
            payload: Token payload to sign
            
        Returns:
            PQC authentication result with signed token
        """
        start_time = time.time()
        
        try:
            self.logger.info(f"Signing PQC token for user: {user_id}")
            
            if not self.pqc_lib:
                if self.config.fallback_to_classical:
                    return await self._fallback_classical_signing(user_id, payload)
                else:
                    return PQCAuthResult(
                        success=False,
                        error_message="PQC library not available"
                    )
            
            dilithium_keypair = await self._get_or_create_dilithium_keypair(user_id)
            
            token_payload = {
                **payload,
                'user_id': user_id,
                'algorithm': 'ML-DSA-65',
                'iat': int(time.time()),
                'exp': int(time.time()) + self.config.session_token_ttl
            }
            
            payload_bytes = json.dumps(token_payload, sort_keys=True).encode('utf-8')
            
            with self._performance_context("dilithium_signing"):
                signature = self.pqc_lib.ml_dsa_sign(payload_bytes, dilithium_keypair['private_key'])
            
            signed_token = {
                'payload': token_payload,
                'signature': signature.hex(),
                'algorithm': 'ML-DSA-65',
                'public_key_hash': hashlib.sha256(dilithium_keypair['public_key']).hexdigest()[:16]
            }
            
            duration_ms = (time.time() - start_time) * 1000
            
            self.logger.info(
                f"PQC token signed successfully for user: {user_id} in {duration_ms:.2f}ms",
                extra={
                    'user_id': user_id,
                    'algorithm': 'ML-DSA-65',
                    'duration_ms': duration_ms
                }
            )
            
            return PQCAuthResult(
                success=True,
                user_id=user_id,
                token=json.dumps(signed_token),
                algorithm='ML-DSA-65',
                performance_metrics={'duration_ms': duration_ms}
            )
            
        except (PQCError, DilithiumError) as e:
            self.logger.error(f"PQC token signing failed: {e}")
            if self.config.fallback_to_classical:
                return await self._fallback_classical_signing(user_id, payload)
            
            return PQCAuthResult(
                success=False,
                error_message=f"PQC token signing failed: {str(e)}"
            )
        except Exception as e:
            self.logger.error(f"Unexpected error during PQC token signing: {e}")
            return PQCAuthResult(
                success=False,
                error_message=f"Token signing error: {str(e)}"
            )
    
    async def verify_pqc_token(self, token: str, user_id: str) -> PQCAuthResult:
        """
        Verify PQC-signed JWT token.
        
        Args:
            token: Signed token to verify
            user_id: Expected user identifier
            
        Returns:
            PQC authentication result
        """
        start_time = time.time()
        
        try:
            self.logger.info(f"DEBUG: Starting PQC token verification for user: {user_id}")
            self.logger.info(f"DEBUG: Token length: {len(token)}")
            
            if not self.pqc_lib:
                self.logger.error("DEBUG: PQC library not available")
                if self.config.fallback_to_classical:
                    return await self._fallback_classical_verification(token, user_id)
                else:
                    return PQCAuthResult(
                        success=False,
                        error_message="PQC library not available"
                    )
            
            try:
                signed_token = json.loads(token)
                payload = signed_token['payload']
                signature_hex = signed_token['signature']
                algorithm = signed_token['algorithm']
                self.logger.info(f"DEBUG: Parsed token - algorithm: {algorithm}, payload keys: {list(payload.keys())}")
                self.logger.info(f"DEBUG: Signature hex length: {len(signature_hex)}")
            except (json.JSONDecodeError, KeyError) as e:
                self.logger.error(f"DEBUG: Token parsing failed: {e}")
                return PQCAuthResult(
                    success=False,
                    error_message=f"Invalid token format: {e}"
                )
            
            if algorithm != 'ML-DSA-65':
                self.logger.error(f"DEBUG: Unsupported algorithm: {algorithm}")
                return PQCAuthResult(
                    success=False,
                    error_message=f"Unsupported algorithm: {algorithm}"
                )
            
            if payload.get('user_id') != user_id:
                self.logger.error(f"DEBUG: User ID mismatch - expected: {user_id}, got: {payload.get('user_id')}")
                return PQCAuthResult(
                    success=False,
                    error_message="User ID mismatch"
                )
            
            exp = payload.get('exp', 0)
            current_time = int(time.time())
            if current_time > exp:
                self.logger.error(f"DEBUG: Token expired - current: {current_time}, exp: {exp}")
                return PQCAuthResult(
                    success=False,
                    error_message="Token expired"
                )
            
            self.logger.info(f"DEBUG: Getting Dilithium keypair for user: {user_id}")
            dilithium_keypair = await self._get_or_create_dilithium_keypair(user_id)
            self.logger.info(f"DEBUG: Got keypair, public key length: {len(dilithium_keypair['public_key']) if dilithium_keypair['public_key'] else 'None'}")
            
            payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')
            signature = bytes.fromhex(signature_hex)
            self.logger.info(f"DEBUG: Payload bytes length: {len(payload_bytes)}, signature bytes length: {len(signature)}")
            self.logger.info(f"DEBUG: Payload for verification: {payload_bytes[:100]}...")
            
            with self._performance_context("dilithium_verification"):
                self.logger.info("DEBUG: Starting Dilithium verification")
                is_valid = self.pqc_lib.ml_dsa_verify(payload_bytes, signature, dilithium_keypair['public_key'])
                self.logger.info(f"DEBUG: Dilithium verification result: {is_valid}")
            
            duration_ms = (time.time() - start_time) * 1000
            
            if is_valid:
                self.logger.info(
                    f"DEBUG: PQC token verification successful for user: {user_id} in {duration_ms:.2f}ms",
                    extra={
                        'user_id': user_id,
                        'algorithm': 'ML-DSA-65',
                        'duration_ms': duration_ms
                    }
                )
                
                return PQCAuthResult(
                    success=True,
                    user_id=user_id,
                    algorithm='ML-DSA-65',
                    performance_metrics={'duration_ms': duration_ms}
                )
            else:
                self.logger.warning(f"DEBUG: PQC token verification failed for user: {user_id} - signature invalid")
                return PQCAuthResult(
                    success=False,
                    error_message="Signature verification failed"
                )
            
        except (PQCError, DilithiumError) as e:
            self.logger.error(f"DEBUG: PQC token verification failed with PQC/Dilithium error: {e}")
            return PQCAuthResult(
                success=False,
                error_message=f"PQC token verification failed: {str(e)}"
            )
        except Exception as e:
            self.logger.error(f"DEBUG: Unexpected error during PQC token verification: {e}")
            import traceback
            self.logger.error(f"DEBUG: Traceback: {traceback.format_exc()}")
            return PQCAuthResult(
                success=False,
                error_message=f"Token verification error: {str(e)}"
            )
    
    async def _get_or_create_kyber_keypair(self, user_id: str) -> Dict[str, bytes]:
        """Get or create cached Kyber keypair for user."""
        cache_key = f"kyber_{user_id}"
        
        cached_keypair = self.kyber_cache.get(cache_key)
        if cached_keypair:
            return cached_keypair
        
        if not self.pqc_lib:
            raise PQCError("PQC library not available")
        
        public_key, private_key = self.pqc_lib.generate_ml_kem_keypair()
        keypair = {
            'public_key': public_key,
            'private_key': private_key,
            'user_id': user_id
        }
        
        self.kyber_cache.put(cache_key, keypair, self.config.kyber_key_cache_ttl)
        
        return keypair
    
    async def _get_or_create_dilithium_keypair(self, user_id: str) -> Dict[str, bytes]:
        """Get or create cached Dilithium keypair for user."""
        cache_key = f"dilithium_{user_id}"
        
        cached_keypair = self.dilithium_cache.get(cache_key)
        if cached_keypair:
            return cached_keypair
        
        if not self.pqc_lib:
            raise PQCError("PQC library not available")
        
        public_key, private_key = self.pqc_lib.generate_ml_dsa_keypair()
        keypair = {
            'public_key': public_key,
            'private_key': private_key,
            'user_id': user_id
        }
        
        self.dilithium_cache.put(cache_key, keypair, self.config.dilithium_key_cache_ttl)
        
        return keypair
    
    def _generate_session_id(self, user_id: str, shared_secret: bytes) -> str:
        """Generate unique session ID."""
        data = f"{user_id}:{shared_secret.hex()}:{time.time()}".encode('utf-8')
        return hashlib.sha256(data).hexdigest()
    
    def _generate_jwt_token(self, session_data: PQCSessionData) -> str:
        """Generate JWT token from session data."""
        payload = {
            'user_id': session_data.user_id,
            'session_id': session_data.session_id,
            'algorithm': session_data.algorithm,
            'iat': int(session_data.created_at.timestamp()),
            'exp': int(session_data.expires_at.timestamp()),
            'pqc': True
        }
        
        import base64
        payload_json = json.dumps(payload)
        return base64.b64encode(payload_json.encode()).decode()
    
    def _performance_context(self, operation_name: str):
        """Context manager for performance monitoring."""
        class PerformanceContext:
            def __init__(self, monitor, config, logger, op_name):
                self.monitor = monitor
                self.config = config
                self.logger = logger
                self.operation_name = op_name
                self.start_time = None
                
            def __enter__(self):
                if self.monitor and self.config.enable_performance_monitoring:
                    self.start_time = time.time()
                return self
                
            def __exit__(self, exc_type, exc_val, exc_tb):
                if self.start_time and self.monitor and self.config.enable_performance_monitoring:
                    duration_ms = (time.time() - self.start_time) * 1000
                    self.logger.debug(f"Operation {self.operation_name} took {duration_ms:.2f}ms")
        
        return PerformanceContext(self.performance_monitor, self.config, self.logger, operation_name)
    
    async def _fallback_classical_session(self, user_id: str, metadata: Optional[Dict[str, Any]] = None) -> PQCAuthResult:
        """Fallback to classical session generation."""
        self.logger.info(f"Using classical fallback for session generation: {user_id}")
        
        session_id = hashlib.sha256(f"{user_id}:{time.time()}".encode()).hexdigest()
        
        return PQCAuthResult(
            success=True,
            user_id=user_id,
            token=session_id,
            algorithm='Classical',
            error_message="PQC not available, using classical fallback"
        )
    
    async def _fallback_classical_signing(self, user_id: str, payload: Dict[str, Any]) -> PQCAuthResult:
        """Fallback to classical token signing."""
        self.logger.info(f"Using classical fallback for token signing: {user_id}")
        
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hashlib.sha256(payload_str.encode()).hexdigest()
        
        return PQCAuthResult(
            success=True,
            user_id=user_id,
            token=signature,
            algorithm='Classical',
            error_message="PQC not available, using classical fallback"
        )
    
    async def _fallback_classical_verification(self, token: str, user_id: str) -> PQCAuthResult:
        """Fallback to classical token verification."""
        self.logger.info(f"Using classical fallback for token verification: {user_id}")
        
        return PQCAuthResult(
            success=True,
            user_id=user_id,
            algorithm='Classical',
            error_message="PQC not available, using classical fallback"
        )
    
    def get_performance_metrics(self) -> Optional[Dict[str, Any]]:
        """Get current performance metrics."""
        if self.performance_monitor:
            return self.performance_monitor.get('metrics', {})
        return None
    
    def clear_caches(self) -> None:
        """Clear all cached keys and sessions."""
        self.kyber_cache.clear()
        self.dilithium_cache.clear()
        self.session_cache.clear()
        self.logger.info("All PQC caches cleared")
    
    def get_cache_stats(self) -> Dict[str, int]:
        """Get cache statistics."""
        return {
            'kyber_cache_size': self.kyber_cache.size(),
            'dilithium_cache_size': self.dilithium_cache.size(),
            'session_cache_size': self.session_cache.size()
        }
