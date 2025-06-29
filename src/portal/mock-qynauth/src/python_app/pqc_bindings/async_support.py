"""
Async Support for Enhanced PQC Bindings

This module provides asynchronous wrappers for Post-Quantum Cryptography
operations to enable non-blocking integration with the Portal Backend.

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, Tuple, Union
from contextlib import asynccontextmanager

from .kyber import KyberKeyPair
from .dilithium import DilithiumKeyPair
from .exceptions import PQCError, KyberError, DilithiumError
from ..monitoring.pqc_logger import pqc_logger
from ..monitoring.performance_monitor import performance_monitor

class AsyncPQCManager:
    """
    Asynchronous manager for PQC operations with thread pool execution.
    
    This class provides async wrappers for CPU-intensive PQC operations
    while maintaining thread safety and performance monitoring.
    """
    
    def __init__(self, max_workers: int = 4):
        """
        Initialize async PQC manager.
        
        Args:
            max_workers: Maximum number of worker threads for PQC operations
        """
        self.max_workers = max_workers
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.active_operations: Dict[str, asyncio.Task] = {}
        self.operation_lock = asyncio.Lock()
        
        pqc_logger.log_pqc_operation(
            "info", 
            f"AsyncPQCManager initialized with {max_workers} workers",
            pqc_operation="manager_init",
            max_workers=max_workers
        )
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with cleanup."""
        await self.shutdown()
    
    async def shutdown(self):
        """Shutdown the async PQC manager and cleanup resources."""
        pqc_logger.log_pqc_operation(
            "info", 
            "Shutting down AsyncPQCManager",
            pqc_operation="manager_shutdown"
        )
        
        async with self.operation_lock:
            for operation_id, task in self.active_operations.items():
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            self.active_operations.clear()
        
        self.executor.shutdown(wait=True)
    
    @asynccontextmanager
    async def track_operation(self, operation_id: str):
        """
        Context manager to track async operations.
        
        Args:
            operation_id: Unique identifier for the operation
        """
        async with self.operation_lock:
            if operation_id in self.active_operations:
                raise ValueError(f"Operation {operation_id} is already active")
        
        try:
            current_task = asyncio.current_task()
            if current_task is not None:
                async with self.operation_lock:
                    self.active_operations[operation_id] = current_task
            
            yield
            
        finally:
            async with self.operation_lock:
                self.active_operations.pop(operation_id, None)
    
    async def generate_kyber_keypair_async(self, user_id: str, 
                                         metadata: Optional[Dict[str, Any]] = None) -> KyberKeyPair:
        """
        Asynchronously generate Kyber keypair.
        
        Args:
            user_id: User identifier for the keypair
            metadata: Optional metadata for the operation
            
        Returns:
            KyberKeyPair instance
            
        Raises:
            KyberError: If key generation fails
        """
        operation_id = f"kyber_keygen_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _generate_keypair():
                with performance_monitor.monitor_operation(
                    "async_key_generation", user_id, "ML-KEM-768", metadata or {}
                ):
                    from ..pqc_bindings import PQCLibraryV2
                    lib = PQCLibraryV2()
                    return KyberKeyPair(lib)
            
            try:
                loop = asyncio.get_event_loop()
                keypair = await loop.run_in_executor(self.executor, _generate_keypair)
                
                pqc_logger.log_key_generation(
                    user_id, "ML-KEM-768", 0, True, 1184  # Duration will be logged by monitor
                )
                
                return keypair
                
            except Exception as e:
                pqc_logger.log_key_generation(
                    user_id, "ML-KEM-768", 0, False
                )
                raise KyberError(f"Async Kyber key generation failed: {str(e)}") from e
    
    async def kyber_encapsulate_async(self, keypair: KyberKeyPair, user_id: str,
                                    metadata: Optional[Dict[str, Any]] = None) -> Tuple[bytes, bytes]:
        """
        Asynchronously perform Kyber encapsulation.
        
        Args:
            keypair: KyberKeyPair instance
            user_id: User identifier
            metadata: Optional metadata for the operation
            
        Returns:
            Tuple of (shared_secret, ciphertext)
            
        Raises:
            KyberError: If encapsulation fails
        """
        operation_id = f"kyber_encap_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _encapsulate():
                with performance_monitor.monitor_operation(
                    "async_encapsulation", user_id, "ML-KEM-768", metadata or {}
                ):
                    return keypair.encapsulate()
            
            try:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(self.executor, _encapsulate)
                
                pqc_logger.log_encapsulation(
                    user_id, "ML-KEM-768", 0, True, len(result[1])
                )
                
                return result
                
            except Exception as e:
                pqc_logger.log_encapsulation(
                    user_id, "ML-KEM-768", 0, False
                )
                raise KyberError(f"Async Kyber encapsulation failed: {str(e)}") from e
    
    async def kyber_decapsulate_async(self, keypair: KyberKeyPair, ciphertext: bytes,
                                    user_id: str, metadata: Optional[Dict[str, Any]] = None) -> bytes:
        """
        Asynchronously perform Kyber decapsulation.
        
        Args:
            keypair: KyberKeyPair instance
            ciphertext: Ciphertext to decapsulate
            user_id: User identifier
            metadata: Optional metadata for the operation
            
        Returns:
            Shared secret bytes
            
        Raises:
            KyberError: If decapsulation fails
        """
        operation_id = f"kyber_decap_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _decapsulate():
                with performance_monitor.monitor_operation(
                    "async_decapsulation", user_id, "ML-KEM-768", metadata or {}
                ):
                    return keypair.decapsulate(ciphertext)
            
            try:
                loop = asyncio.get_event_loop()
                shared_secret = await loop.run_in_executor(self.executor, _decapsulate)
                
                pqc_logger.log_encapsulation(
                    user_id, "ML-KEM-768", 0, True, len(ciphertext)
                )
                
                return shared_secret
                
            except Exception as e:
                pqc_logger.log_encapsulation(
                    user_id, "ML-KEM-768", 0, False
                )
                raise KyberError(f"Async Kyber decapsulation failed: {str(e)}") from e
    
    async def generate_dilithium_keypair_async(self, user_id: str,
                                             metadata: Optional[Dict[str, Any]] = None) -> DilithiumKeyPair:
        """
        Asynchronously generate Dilithium keypair.
        
        Args:
            user_id: User identifier for the keypair
            metadata: Optional metadata for the operation
            
        Returns:
            DilithiumKeyPair instance
            
        Raises:
            DilithiumError: If key generation fails
        """
        operation_id = f"dilithium_keygen_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _generate_keypair():
                with performance_monitor.monitor_operation(
                    "async_key_generation", user_id, "ML-DSA-65", metadata or {}
                ):
                    from ..pqc_bindings import PQCLibraryV2
                    lib = PQCLibraryV2()
                    return DilithiumKeyPair(lib)
            
            try:
                loop = asyncio.get_event_loop()
                keypair = await loop.run_in_executor(self.executor, _generate_keypair)
                
                pqc_logger.log_key_generation(
                    user_id, "ML-DSA-65", 0, True, 2592  # ML-DSA-65 key size
                )
                
                return keypair
                
            except Exception as e:
                pqc_logger.log_key_generation(
                    user_id, "ML-DSA-65", 0, False
                )
                raise DilithiumError(f"Async Dilithium key generation failed: {str(e)}") from e
    
    async def dilithium_sign_async(self, keypair: DilithiumKeyPair, message: bytes,
                                 user_id: str, metadata: Optional[Dict[str, Any]] = None) -> bytes:
        """
        Asynchronously sign message with Dilithium.
        
        Args:
            keypair: DilithiumKeyPair instance
            message: Message to sign
            user_id: User identifier
            metadata: Optional metadata for the operation
            
        Returns:
            Signature bytes
            
        Raises:
            DilithiumError: If signing fails
        """
        operation_id = f"dilithium_sign_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _sign():
                with performance_monitor.monitor_operation(
                    "async_signature", user_id, "ML-DSA-65", metadata or {}
                ):
                    return keypair.sign(message)
            
            try:
                loop = asyncio.get_event_loop()
                signature = await loop.run_in_executor(self.executor, _sign)
                
                pqc_logger.log_signature(
                    user_id, "ML-DSA-65", 0, True, len(signature)
                )
                
                return signature
                
            except Exception as e:
                pqc_logger.log_signature(
                    user_id, "ML-DSA-65", 0, False
                )
                raise DilithiumError(f"Async Dilithium signing failed: {str(e)}") from e
    
    async def dilithium_verify_async(self, keypair: DilithiumKeyPair, message: bytes,
                                   signature: bytes, user_id: str,
                                   metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Asynchronously verify Dilithium signature.
        
        Args:
            keypair: DilithiumKeyPair instance
            message: Original message
            signature: Signature to verify
            user_id: User identifier
            metadata: Optional metadata for the operation
            
        Returns:
            True if signature is valid, False otherwise
            
        Raises:
            DilithiumError: If verification fails
        """
        operation_id = f"dilithium_verify_{user_id}_{asyncio.get_event_loop().time()}"
        
        async with self.track_operation(operation_id):
            def _verify():
                with performance_monitor.monitor_operation(
                    "async_verification", user_id, "ML-DSA-65", metadata or {}
                ):
                    return keypair.verify(message, signature)
            
            try:
                loop = asyncio.get_event_loop()
                is_valid = await loop.run_in_executor(self.executor, _verify)
                
                pqc_logger.log_signature(
                    user_id, "ML-DSA-65", 0, True, len(signature)
                )
                
                return is_valid
                
            except Exception as e:
                pqc_logger.log_signature(
                    user_id, "ML-DSA-65", 0, False
                )
                raise DilithiumError(f"Async Dilithium verification failed: {str(e)}") from e
    
    async def get_operation_status(self) -> Dict[str, Any]:
        """
        Get status of active operations.
        
        Returns:
            Dictionary with operation status information
        """
        async with self.operation_lock:
            active_count = len(self.active_operations)
            operation_ids = list(self.active_operations.keys())
        
        return {
            "active_operations": active_count,
            "max_workers": self.max_workers,
            "operation_ids": operation_ids,
            "executor_status": {
                "shutdown": self.executor._shutdown,
                "threads": len(self.executor._threads) if hasattr(self.executor, '_threads') else 0
            }
        }

async_pqc_manager = AsyncPQCManager()

async def async_generate_kyber_keypair(user_id: str, metadata: Optional[Dict[str, Any]] = None) -> KyberKeyPair:
    """Generate Kyber keypair asynchronously."""
    return await async_pqc_manager.generate_kyber_keypair_async(user_id, metadata)

async def async_kyber_encapsulate(keypair: KyberKeyPair, user_id: str,
                                metadata: Optional[Dict[str, Any]] = None) -> Tuple[bytes, bytes]:
    """Perform Kyber encapsulation asynchronously."""
    return await async_pqc_manager.kyber_encapsulate_async(keypair, user_id, metadata)

async def async_kyber_decapsulate(keypair: KyberKeyPair, ciphertext: bytes, user_id: str,
                                metadata: Optional[Dict[str, Any]] = None) -> bytes:
    """Perform Kyber decapsulation asynchronously."""
    return await async_pqc_manager.kyber_decapsulate_async(keypair, ciphertext, user_id, metadata)

async def async_generate_dilithium_keypair(user_id: str, metadata: Optional[Dict[str, Any]] = None) -> DilithiumKeyPair:
    """Generate Dilithium keypair asynchronously."""
    return await async_pqc_manager.generate_dilithium_keypair_async(user_id, metadata)

async def async_dilithium_sign(keypair: DilithiumKeyPair, message: bytes, user_id: str,
                             metadata: Optional[Dict[str, Any]] = None) -> bytes:
    """Sign message with Dilithium asynchronously."""
    return await async_pqc_manager.dilithium_sign_async(keypair, message, user_id, metadata)

async def async_dilithium_verify(keypair: DilithiumKeyPair, message: bytes, signature: bytes,
                               user_id: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """Verify Dilithium signature asynchronously."""
    return await async_pqc_manager.dilithium_verify_async(keypair, message, signature, user_id, metadata)
