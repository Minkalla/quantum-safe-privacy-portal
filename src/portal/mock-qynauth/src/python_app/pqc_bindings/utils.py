"""
PQC Bindings Utilities

This module provides shared utilities for the enhanced PQC bindings package,
including secure memory management, validation, and helper functions.

Compliance:
- NIST SP 800-53 (SC-12): Cryptographic Key Establishment and Management
- NIST SP 800-53 (SC-13): Cryptographic Protection
"""

import ctypes
import hashlib
import secrets
import time
from typing import Any, Tuple, Optional, Dict, Union
from contextlib import contextmanager

from .exceptions import ValidationError, SecurityError

def validate_key_size(key: bytes, expected_size: int, key_type: str) -> None:
    """
    Validate that a key has the expected size.
    
    Args:
        key: The key to validate
        expected_size: Expected size in bytes
        key_type: Type of key for error messages
        
    Raises:
        ValidationError: If key size is invalid
    """
    if not isinstance(key, bytes):
        raise ValidationError(f"{key_type} must be bytes", "INVALID_KEY_TYPE")
    
    if len(key) != expected_size:
        raise ValidationError(
            f"{key_type} must be {expected_size} bytes, got {len(key)}",
            "INVALID_KEY_SIZE",
            {"expected": expected_size, "actual": len(key)}
        )

def validate_message(message: bytes, max_size: int = 1024 * 1024) -> None:
    """
    Validate message for signing/verification.
    
    Args:
        message: Message to validate
        max_size: Maximum allowed message size
        
    Raises:
        ValidationError: If message is invalid
    """
    if not isinstance(message, bytes):
        raise ValidationError("Message must be bytes", "INVALID_MESSAGE_TYPE")
    
    if len(message) == 0:
        raise ValidationError("Message cannot be empty", "EMPTY_MESSAGE")
    
    if len(message) > max_size:
        raise ValidationError(
            f"Message too large: {len(message)} bytes (max: {max_size})",
            "MESSAGE_TOO_LARGE",
            {"size": len(message), "max_size": max_size}
        )

def secure_zero_memory(data: bytearray) -> None:
    """
    Securely zero out memory containing sensitive data.
    
    Args:
        data: Bytearray to zero out
    """
    if isinstance(data, bytearray):
        for i in range(len(data)):
            data[i] = 0

@contextmanager
def secure_memory_context(size: int):
    """
    Context manager for secure memory allocation and cleanup.
    
    Args:
        size: Size of memory to allocate
        
    Yields:
        bytearray: Allocated memory
    """
    memory = bytearray(size)
    try:
        yield memory
    finally:
        secure_zero_memory(memory)

def bytes_to_c_array(data: bytes) -> Tuple[Any, int]:
    """
    Convert Python bytes to C array for FFI.
    
    Args:
        data: Bytes to convert
        
    Returns:
        Tuple of (c_array_pointer, length)
    """
    if not data:
        return None, 0
    
    array_type = ctypes.c_uint8 * len(data)
    c_array = array_type(*data)
    return ctypes.cast(c_array, ctypes.POINTER(ctypes.c_uint8)), len(data)

def generate_secure_random(size: int) -> bytes:
    """
    Generate cryptographically secure random bytes.
    
    Args:
        size: Number of bytes to generate
        
    Returns:
        Secure random bytes
    """
    return secrets.token_bytes(size)

def constant_time_compare(a: bytes, b: bytes) -> bool:
    """
    Constant-time comparison of byte sequences.
    
    Args:
        a: First byte sequence
        b: Second byte sequence
        
    Returns:
        True if sequences are equal, False otherwise
    """
    if len(a) != len(b):
        return False
    
    result = 0
    for x, y in zip(a, b):
        result |= x ^ y
    
    return result == 0

def hash_key_for_logging(key: bytes) -> str:
    """
    Create a safe hash of a key for logging purposes.
    
    Args:
        key: Key to hash
        
    Returns:
        SHA256 hash (first 16 characters)
    """
    return hashlib.sha256(key).hexdigest()[:16]

class PerformanceTimer:
    """Context manager for measuring operation performance."""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.duration_ms: Optional[float] = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        if self.start_time is not None:
            self.duration_ms = (self.end_time - self.start_time) * 1000
    
    def get_duration_ms(self) -> float:
        """Get operation duration in milliseconds."""
        return self.duration_ms if self.duration_ms is not None else 0.0

def validate_algorithm_parameters(algorithm: str, key_size: int) -> None:
    """
    Validate algorithm parameters against NIST specifications.
    
    Args:
        algorithm: Algorithm name
        key_size: Key size in bytes
        
    Raises:
        ValidationError: If parameters are invalid
    """
    valid_algorithms = {
        "ML-KEM-768": {"public_key": 1184, "private_key": 2400},
        "ML-DSA-65": {"public_key": 1952, "private_key": 4032}
    }
    
    if algorithm not in valid_algorithms:
        raise ValidationError(
            f"Unsupported algorithm: {algorithm}",
            "INVALID_ALGORITHM",
            {"algorithm": algorithm, "supported": list(valid_algorithms.keys())}
        )

def create_operation_metadata(operation: str, **kwargs) -> Dict[str, Any]:
    """
    Create standardized metadata for operations.
    
    Args:
        operation: Operation name
        **kwargs: Additional metadata
        
    Returns:
        Metadata dictionary
    """
    return {
        "operation": operation,
        "timestamp": time.time(),
        "version": "3.1.0",
        **kwargs
    }
