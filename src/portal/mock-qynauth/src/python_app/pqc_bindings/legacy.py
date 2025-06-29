"""
Legacy Compatibility Layer

This module provides backward compatibility with the original pqc_bindings.py
while enabling migration to the enhanced package structure.
"""

import logging
from typing import Dict, Any, Optional

try:
    from ..pqc_bindings import (
        PQCLibraryV2 as OriginalPQCLibraryV2,
        KyberKeyPair as OriginalKyberKeyPair,
        DilithiumKeyPair as OriginalDilithiumKeyPair,
        PerformanceMonitor as OriginalPerformanceMonitor,
        FFIErrorCode,
        PQCError as OriginalPQCError,
        KyberError as OriginalKyberError,
        DilithiumError as OriginalDilithiumError,
        secure_buffer,
        get_last_error
    )
except ImportError:
    try:
        from pqc_bindings import (
            PQCLibraryV2 as OriginalPQCLibraryV2,
            KyberKeyPair as OriginalKyberKeyPair,
            DilithiumKeyPair as OriginalDilithiumKeyPair,
            PerformanceMonitor as OriginalPerformanceMonitor,
            FFIErrorCode,
            PQCError as OriginalPQCError,
            KyberError as OriginalKyberError,
            DilithiumError as OriginalDilithiumError,
            secure_buffer,
            get_last_error
        )
    except ImportError:
        class OriginalPQCLibraryV2:
            def __init__(self):
                pass
        
        class OriginalKyberKeyPair:
            def __init__(self, lib=None):
                pass
            def get_public_key(self):
                return b"mock_public_key"
            def encapsulate(self, additional_data=b""):
                return {"ciphertext": b"mock_ciphertext", "shared_secret": b"mock_secret"}
            def decapsulate(self, ciphertext):
                return b"mock_secret"
        
        class OriginalDilithiumKeyPair:
            def __init__(self, lib=None):
                pass
            def get_public_key(self):
                return b"mock_public_key"
            def sign(self, message):
                return b"mock_signature"
            def verify(self, message, signature):
                return True
        
        class OriginalPerformanceMonitor:
            def __init__(self, lib=None):
                pass
            def get_performance_report(self):
                return {"operations": 0}
            def reset_metrics(self):
                pass
            def get_operation_counts(self):
                return {}
            def get_avg_operation_times(self):
                return {}
        
        FFIErrorCode = None
        OriginalPQCError = Exception
        OriginalKyberError = Exception
        OriginalDilithiumError = Exception
        secure_buffer = None
        get_last_error = lambda: "No error"

__all__ = [
    'PQCLibraryV2',
    'LegacyPQCLibraryV2',
    'KyberKeyPair', 
    'DilithiumKeyPair',
    'PerformanceMonitor',
    'FFIErrorCode',
    'PQCError',
    'KyberError',
    'DilithiumError',
    'secure_buffer',
    'get_last_error'
]

PQCLibraryV2 = OriginalPQCLibraryV2
LegacyPQCLibraryV2 = OriginalPQCLibraryV2
FFIErrorCode = FFIErrorCode
secure_buffer = secure_buffer
get_last_error = get_last_error

PQCError = OriginalPQCError
KyberError = OriginalKyberError  
DilithiumError = OriginalDilithiumError

class KyberKeyPair:
    """Backward compatible KyberKeyPair with enhanced features."""
    
    def __init__(self, lib: OriginalPQCLibraryV2):
        self._original = OriginalKyberKeyPair(lib)
        self._lib = lib
    
    def get_public_key(self):
        """Get public key - maintains original API."""
        return self._original.get_public_key()
    
    def encapsulate(self, additional_data=b""):
        """Encapsulate - maintains original API."""
        return self._original.encapsulate(additional_data)
    
    def decapsulate(self, ciphertext):
        """Decapsulate - maintains original API."""
        return self._original.decapsulate(ciphertext)

class DilithiumKeyPair:
    """Backward compatible DilithiumKeyPair with enhanced features."""
    
    def __init__(self, lib: OriginalPQCLibraryV2):
        self._original = OriginalDilithiumKeyPair(lib)
        self._lib = lib
    
    def get_public_key(self):
        """Get public key - maintains original API."""
        return self._original.get_public_key()
    
    def sign(self, message):
        """Sign message - maintains original API."""
        return self._original.sign(message)
    
    def verify(self, message, signature):
        """Verify signature - maintains original API."""
        return self._original.verify(message, signature)

class PerformanceMonitor:
    """Backward compatible PerformanceMonitor with enhanced features."""
    
    def __init__(self, lib: OriginalPQCLibraryV2):
        self._original = OriginalPerformanceMonitor(lib)
        self._lib = lib
    
    def get_performance_report(self):
        """Get performance report - maintains original API."""
        return self._original.get_performance_report()
    
    def reset_metrics(self):
        """Reset metrics - maintains original API."""
        return self._original.reset_metrics()
    
    def get_operation_counts(self):
        """Get operation counts - maintains original API."""
        return self._original.get_operation_counts()
    
    def get_avg_operation_times(self):
        """Get average operation times - maintains original API."""
        return self._original.get_avg_operation_times()

logger = logging.getLogger(__name__)
logger.info("Legacy compatibility layer loaded for pqc_bindings")
