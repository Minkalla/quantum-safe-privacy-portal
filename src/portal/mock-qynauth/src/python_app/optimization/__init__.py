"""
PQC Performance Optimization Package

This package provides performance optimization utilities for Post-Quantum
Cryptography operations including connection pooling, caching, rate limiting,
and batch processing.

Modules:
- connection_pool: Connection pooling and resource management
- cache_manager: Intelligent caching for PQC operations
- rate_limiter: Rate limiting and throttling utilities
- batch_processor: Batch processing for bulk operations

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

from .connection_pool import PQCConnectionPool, pqc_pool
from .cache_manager import PQCCacheManager, pqc_cache
from .rate_limiter import rate_limit, PQCRateLimiter
from .batch_processor import batch_process, PQCBatchProcessor

__all__ = [
    'PQCConnectionPool',
    'pqc_pool',
    'PQCCacheManager', 
    'pqc_cache',
    'rate_limit',
    'PQCRateLimiter',
    'batch_process',
    'PQCBatchProcessor'
]

__version__ = "3.1.0"
__author__ = "Minkalla Quantum-Safe Privacy Portal Team"
