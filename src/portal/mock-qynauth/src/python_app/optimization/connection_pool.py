"""
PQC Connection Pool and Resource Management

This module provides connection pooling and resource management for
Post-Quantum Cryptography operations to optimize performance and resource usage.

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

import asyncio
import time
import threading
from typing import Dict, Optional, Any, List
from dataclasses import dataclass, field
from collections import defaultdict
from contextlib import asynccontextmanager

from ..monitoring.pqc_logger import pqc_logger

@dataclass
class ConnectionContext:
    """Context for a PQC connection."""
    id: str
    created_at: float
    operations_count: int = 0
    last_used: float = field(default_factory=time.time)
    is_active: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)

class PQCConnectionPool:
    """
    Connection pool for PQC operations with resource management.
    
    This class manages a pool of connection contexts to optimize
    resource usage and provide connection reuse for PQC operations.
    """
    
    def __init__(self, max_connections: int = 10, connection_timeout: float = 30.0,
                 cleanup_interval: float = 60.0):
        """
        Initialize PQC connection pool.
        
        Args:
            max_connections: Maximum number of connections in the pool
            connection_timeout: Timeout for acquiring connections (seconds)
            cleanup_interval: Interval for cleaning up stale connections (seconds)
        """
        self.max_connections = max_connections
        self.connection_timeout = connection_timeout
        self.cleanup_interval = cleanup_interval
        
        self._connections: asyncio.Queue = asyncio.Queue(maxsize=max_connections)
        self._active_connections: Dict[str, ConnectionContext] = {}
        self._stats = defaultdict(int)
        self._lock = asyncio.Lock()
        self._cleanup_task: Optional[asyncio.Task] = None
        self._shutdown_event = asyncio.Event()
        
        self._initialize_pool()
        
        pqc_logger.log_pqc_operation(
            "info",
            f"PQC connection pool initialized with {max_connections} connections",
            pqc_operation="pool_init",
            max_connections=max_connections,
            connection_timeout=connection_timeout
        )
    
    def _initialize_pool(self):
        """Initialize the connection pool with available connections."""
        for i in range(self.max_connections):
            connection = self._create_connection(f"conn_{i}")
            try:
                self._connections.put_nowait(connection)
            except asyncio.QueueFull:
                break
    
    def _create_connection(self, connection_id: str) -> ConnectionContext:
        """
        Create a new connection context.
        
        Args:
            connection_id: Unique identifier for the connection
            
        Returns:
            ConnectionContext instance
        """
        return ConnectionContext(
            id=connection_id,
            created_at=time.time(),
            metadata={
                "thread_id": threading.get_ident(),
                "process_id": id(threading.current_thread())
            }
        )
    
    async def start_cleanup_task(self):
        """Start the background cleanup task."""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def _cleanup_loop(self):
        """Background task to clean up stale connections."""
        while not self._shutdown_event.is_set():
            try:
                await asyncio.wait_for(
                    self._shutdown_event.wait(),
                    timeout=self.cleanup_interval
                )
                break  # Shutdown requested
            except asyncio.TimeoutError:
                await self._cleanup_stale_connections()
    
    async def _cleanup_stale_connections(self):
        """Clean up stale and inactive connections."""
        current_time = time.time()
        stale_threshold = 300.0  # 5 minutes
        
        async with self._lock:
            stale_connections = [
                conn_id for conn_id, conn in self._active_connections.items()
                if current_time - conn.last_used > stale_threshold
            ]
            
            for conn_id in stale_connections:
                conn = self._active_connections.pop(conn_id)
                conn.is_active = False
                self._stats['connections_cleaned'] += 1
                
                pqc_logger.log_pqc_operation(
                    "debug",
                    f"Cleaned up stale connection: {conn_id}",
                    pqc_operation="connection_cleanup",
                    connection_id=conn_id,
                    age_seconds=current_time - conn.created_at
                )
    
    @asynccontextmanager
    async def get_connection(self, user_id: str = "unknown"):
        """
        Get a connection from the pool with context management.
        
        Args:
            user_id: User identifier for logging and tracking
            
        Yields:
            ConnectionContext instance
            
        Raises:
            asyncio.TimeoutError: If connection acquisition times out
        """
        connection = None
        try:
            connection = await asyncio.wait_for(
                self._connections.get(),
                timeout=self.connection_timeout
            )
            
            connection.last_used = time.time()
            connection.operations_count += 1
            
            async with self._lock:
                self._active_connections[connection.id] = connection
            
            self._stats['connections_acquired'] += 1
            
            pqc_logger.log_pqc_operation(
                "debug",
                f"Connection acquired: {connection.id}",
                pqc_operation="connection_acquire",
                connection_id=connection.id,
                user_id=user_id,
                operations_count=connection.operations_count
            )
            
            yield connection
            
        except asyncio.TimeoutError:
            self._stats['connection_timeouts'] += 1
            pqc_logger.log_pqc_operation(
                "warning",
                f"Connection pool timeout for user: {user_id}",
                pqc_operation="connection_timeout",
                user_id=user_id,
                timeout=self.connection_timeout
            )
            raise
            
        finally:
            if connection:
                async with self._lock:
                    self._active_connections.pop(connection.id, None)
                
                try:
                    self._connections.put_nowait(connection)
                    self._stats['connections_returned'] += 1
                    
                    pqc_logger.log_pqc_operation(
                        "debug",
                        f"Connection returned: {connection.id}",
                        pqc_operation="connection_return",
                        connection_id=connection.id,
                        user_id=user_id
                    )
                except asyncio.QueueFull:
                    self._stats['connections_discarded'] += 1
    
    async def get_pool_status(self) -> Dict[str, Any]:
        """
        Get current pool status and statistics.
        
        Returns:
            Dictionary with pool status information
        """
        async with self._lock:
            active_count = len(self._active_connections)
            available_count = self._connections.qsize()
        
        return {
            "max_connections": self.max_connections,
            "active_connections": active_count,
            "available_connections": available_count,
            "total_connections": active_count + available_count,
            "stats": dict(self._stats),
            "cleanup_task_running": self._cleanup_task is not None and not self._cleanup_task.done()
        }
    
    async def shutdown(self):
        """Shutdown the connection pool and cleanup resources."""
        pqc_logger.log_pqc_operation(
            "info",
            "Shutting down PQC connection pool",
            pqc_operation="pool_shutdown"
        )
        
        self._shutdown_event.set()
        
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        async with self._lock:
            for conn in self._active_connections.values():
                conn.is_active = False
            self._active_connections.clear()
        
        while not self._connections.empty():
            try:
                self._connections.get_nowait()
            except asyncio.QueueEmpty:
                break
    
    def get_stats(self) -> Dict[str, int]:
        """Get connection pool statistics."""
        return dict(self._stats)

pqc_pool = PQCConnectionPool()

async def initialize_pool():
    """Initialize the global connection pool."""
    await pqc_pool.start_cleanup_task()

async def shutdown_pool():
    """Shutdown the global connection pool."""
    await pqc_pool.shutdown()

@asynccontextmanager
async def get_pqc_connection(user_id: str = "unknown"):
    """
    Convenience function to get a connection from the global pool.
    
    Args:
        user_id: User identifier for logging and tracking
        
    Yields:
        ConnectionContext instance
    """
    async with pqc_pool.get_connection(user_id) as connection:
        yield connection
