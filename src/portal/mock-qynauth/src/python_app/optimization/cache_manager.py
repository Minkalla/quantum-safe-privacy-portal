"""
PQC Cache Manager

This module provides intelligent caching for Post-Quantum Cryptography
operations to improve performance and reduce computational overhead.

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

import asyncio
import time
import hashlib
import pickle
from typing import Dict, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

from ..monitoring.pqc_logger import pqc_logger

class CachePolicy(Enum):
    """Cache eviction policies."""
    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    TTL = "ttl"  # Time To Live

@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int = 0
    ttl: Optional[float] = None
    size_bytes: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def is_expired(self) -> bool:
        """Check if the cache entry has expired."""
        if self.ttl is None:
            return False
        return time.time() - self.created_at > self.ttl
    
    def touch(self):
        """Update access metadata."""
        self.last_accessed = time.time()
        self.access_count += 1

class PQCCacheManager:
    """
    Intelligent cache manager for PQC operations.
    
    This class provides caching capabilities with multiple eviction policies,
    TTL support, and performance monitoring for PQC operations.
    """
    
    def __init__(self, max_size: int = 1000, max_memory_mb: int = 100,
                 default_ttl: float = 3600.0, policy: CachePolicy = CachePolicy.LRU):
        """
        Initialize PQC cache manager.
        
        Args:
            max_size: Maximum number of cache entries
            max_memory_mb: Maximum memory usage in MB
            default_ttl: Default TTL for cache entries (seconds)
            policy: Cache eviction policy
        """
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.default_ttl = default_ttl
        self.policy = policy
        
        self._cache: Dict[str, CacheEntry] = {}
        self._stats = defaultdict(int)
        self._lock = asyncio.Lock()
        self._current_memory = 0
        
        pqc_logger.log_pqc_operation(
            "info",
            f"PQC cache manager initialized",
            pqc_operation="cache_init",
            max_size=max_size,
            max_memory_mb=max_memory_mb,
            default_ttl=default_ttl,
            policy=policy.value
        )
    
    def _generate_cache_key(self, operation: str, user_id: str, 
                          algorithm: str, **kwargs) -> str:
        """
        Generate a cache key for PQC operations.
        
        Args:
            operation: PQC operation type
            user_id: User identifier
            algorithm: Cryptographic algorithm
            **kwargs: Additional parameters
            
        Returns:
            Cache key string
        """
        key_data = {
            "operation": operation,
            "user_id": user_id,
            "algorithm": algorithm,
            **kwargs
        }
        
        key_str = str(sorted(key_data.items()))
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]
    
    def _calculate_size(self, value: Any) -> int:
        """Calculate the size of a value in bytes."""
        try:
            return len(pickle.dumps(value))
        except Exception:
            return len(str(value).encode('utf-8'))
    
    async def _evict_entries(self, required_space: int = 0):
        """
        Evict cache entries based on the configured policy.
        
        Args:
            required_space: Additional space required in bytes
        """
        if not self._cache:
            return
        
        entries_to_remove = []
        
        current_time = time.time()
        for key, entry in self._cache.items():
            if entry.is_expired():
                entries_to_remove.append(key)
        
        if self.policy == CachePolicy.LRU:
            sorted_entries = sorted(
                self._cache.items(),
                key=lambda x: x[1].last_accessed
            )
        elif self.policy == CachePolicy.LFU:
            sorted_entries = sorted(
                self._cache.items(),
                key=lambda x: x[1].access_count
            )
        else:  # TTL policy
            sorted_entries = sorted(
                self._cache.items(),
                key=lambda x: x[1].created_at
            )
        
        target_size = max(0, self.max_size - 1)  # Leave room for new entry
        target_memory = max(0, self.max_memory_bytes - required_space)
        
        for key, entry in sorted_entries:
            if (len(self._cache) <= target_size and 
                self._current_memory <= target_memory):
                break
            
            if key not in entries_to_remove:
                entries_to_remove.append(key)
        
        for key in entries_to_remove:
            entry = self._cache.pop(key, None)
            if entry:
                self._current_memory -= entry.size_bytes
                self._stats['entries_evicted'] += 1
                
                pqc_logger.log_pqc_operation(
                    "debug",
                    f"Cache entry evicted: {key}",
                    pqc_operation="cache_evict",
                    cache_key=key,
                    reason=self.policy.value,
                    age_seconds=current_time - entry.created_at
                )
    
    async def get(self, operation: str, user_id: str, algorithm: str,
                  **kwargs) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            operation: PQC operation type
            user_id: User identifier
            algorithm: Cryptographic algorithm
            **kwargs: Additional parameters
            
        Returns:
            Cached value or None if not found
        """
        cache_key = self._generate_cache_key(operation, user_id, algorithm, **kwargs)
        
        async with self._lock:
            entry = self._cache.get(cache_key)
            
            if entry is None:
                self._stats['cache_misses'] += 1
                return None
            
            if entry.is_expired():
                self._cache.pop(cache_key)
                self._current_memory -= entry.size_bytes
                self._stats['cache_expired'] += 1
                return None
            
            entry.touch()
            self._stats['cache_hits'] += 1
            
            pqc_logger.log_pqc_operation(
                "debug",
                f"Cache hit: {cache_key}",
                pqc_operation="cache_hit",
                cache_key=cache_key,
                operation=operation,
                user_id=user_id,
                algorithm=algorithm
            )
            
            return entry.value
    
    async def set(self, operation: str, user_id: str, algorithm: str,
                  value: Any, ttl: Optional[float] = None, **kwargs):
        """
        Set value in cache.
        
        Args:
            operation: PQC operation type
            user_id: User identifier
            algorithm: Cryptographic algorithm
            value: Value to cache
            ttl: Time to live (seconds), uses default if None
            **kwargs: Additional parameters
        """
        cache_key = self._generate_cache_key(operation, user_id, algorithm, **kwargs)
        value_size = self._calculate_size(value)
        
        async with self._lock:
            if (len(self._cache) >= self.max_size or 
                self._current_memory + value_size > self.max_memory_bytes):
                await self._evict_entries(value_size)
            
            entry = CacheEntry(
                key=cache_key,
                value=value,
                created_at=time.time(),
                last_accessed=time.time(),
                ttl=ttl or self.default_ttl,
                size_bytes=value_size,
                metadata={
                    "operation": operation,
                    "user_id": user_id,
                    "algorithm": algorithm
                }
            )
            
            existing_entry = self._cache.get(cache_key)
            if existing_entry:
                self._current_memory -= existing_entry.size_bytes
            
            self._cache[cache_key] = entry
            self._current_memory += value_size
            self._stats['cache_sets'] += 1
            
            pqc_logger.log_pqc_operation(
                "debug",
                f"Cache set: {cache_key}",
                pqc_operation="cache_set",
                cache_key=cache_key,
                operation=operation,
                user_id=user_id,
                algorithm=algorithm,
                size_bytes=value_size
            )
    
    async def invalidate(self, operation: Optional[str] = None, user_id: Optional[str] = None,
                        algorithm: Optional[str] = None, **kwargs):
        """
        Invalidate cache entries matching the criteria.
        
        Args:
            operation: PQC operation type (None for all)
            user_id: User identifier (None for all)
            algorithm: Cryptographic algorithm (None for all)
            **kwargs: Additional parameters
        """
        async with self._lock:
            keys_to_remove = []
            
            for key, entry in self._cache.items():
                should_remove = True
                
                if operation and entry.metadata.get("operation") != operation:
                    should_remove = False
                if user_id and entry.metadata.get("user_id") != user_id:
                    should_remove = False
                if algorithm and entry.metadata.get("algorithm") != algorithm:
                    should_remove = False
                
                if should_remove:
                    keys_to_remove.append(key)
            
            for key in keys_to_remove:
                entry = self._cache.pop(key)
                self._current_memory -= entry.size_bytes
                self._stats['cache_invalidations'] += 1
                
                pqc_logger.log_pqc_operation(
                    "debug",
                    f"Cache invalidated: {key}",
                    pqc_operation="cache_invalidate",
                    cache_key=key
                )
    
    async def clear(self):
        """Clear all cache entries."""
        async with self._lock:
            entry_count = len(self._cache)
            self._cache.clear()
            self._current_memory = 0
            self._stats['cache_clears'] += 1
            
            pqc_logger.log_pqc_operation(
                "info",
                f"Cache cleared: {entry_count} entries removed",
                pqc_operation="cache_clear",
                entries_removed=entry_count
            )
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        async with self._lock:
            hit_rate = 0.0
            total_requests = self._stats['cache_hits'] + self._stats['cache_misses']
            if total_requests > 0:
                hit_rate = self._stats['cache_hits'] / total_requests
            
            return {
                "max_size": self.max_size,
                "current_size": len(self._cache),
                "max_memory_bytes": self.max_memory_bytes,
                "current_memory_bytes": self._current_memory,
                "memory_usage_percent": (self._current_memory / self.max_memory_bytes) * 100,
                "hit_rate": hit_rate,
                "policy": self.policy.value,
                "default_ttl": self.default_ttl,
                "stats": dict(self._stats)
            }

pqc_cache = PQCCacheManager()

async def cache_pqc_operation(operation: str, user_id: str, algorithm: str,
                             value: Any, ttl: Optional[float] = None, **kwargs):
    """
    Cache a PQC operation result.
    
    Args:
        operation: PQC operation type
        user_id: User identifier
        algorithm: Cryptographic algorithm
        value: Value to cache
        ttl: Time to live (seconds)
        **kwargs: Additional parameters
    """
    await pqc_cache.set(operation, user_id, algorithm, value, ttl, **kwargs)

async def get_cached_pqc_operation(operation: str, user_id: str, algorithm: str,
                                  **kwargs) -> Optional[Any]:
    """
    Get cached PQC operation result.
    
    Args:
        operation: PQC operation type
        user_id: User identifier
        algorithm: Cryptographic algorithm
        **kwargs: Additional parameters
        
    Returns:
        Cached value or None if not found
    """
    return await pqc_cache.get(operation, user_id, algorithm, **kwargs)
