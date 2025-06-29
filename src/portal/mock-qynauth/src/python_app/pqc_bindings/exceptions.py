"""
PQC Bindings Exception Hierarchy

This module defines custom exceptions for the enhanced PQC bindings package,
providing comprehensive error handling for all PQC operations.

Compliance:
- NIST SP 800-53 (SI-11): Error Handling
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

from typing import Optional

class PQCError(Exception):
    """Base exception for all PQC-related errors."""
    
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[dict] = None):
        super().__init__(message)
        self.error_code = error_code
        self.details = details or {}
        self.timestamp = __import__('datetime').datetime.utcnow().isoformat()

class KyberError(PQCError):
    """Exception for Kyber (ML-KEM-768) related errors."""
    pass

class DilithiumError(PQCError):
    """Exception for Dilithium (ML-DSA-65) related errors."""
    pass

class KeyGenerationError(PQCError):
    """Exception for key generation failures."""
    pass

class EncapsulationError(KyberError):
    """Exception for ML-KEM encapsulation failures."""
    pass

class DecapsulationError(KyberError):
    """Exception for ML-KEM decapsulation failures."""
    pass

class SignatureError(DilithiumError):
    """Exception for ML-DSA signature failures."""
    pass

class VerificationError(DilithiumError):
    """Exception for ML-DSA verification failures."""
    pass

class FFIError(PQCError):
    """Exception for FFI interface errors."""
    pass

class ValidationError(PQCError):
    """Exception for input validation errors."""
    pass

class PerformanceError(PQCError):
    """Exception for performance monitoring errors."""
    pass

class SecurityError(PQCError):
    """Exception for security-related errors."""
    pass
