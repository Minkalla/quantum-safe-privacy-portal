"""
PQC Batch Processor

This module provides batch processing utilities for Post-Quantum Cryptography
operations to optimize performance when handling multiple requests.

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

import asyncio
import time
from typing import List, Dict, Any, Optional, Callable, TypeVar, Generic, Union
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

from ..monitoring.pqc_logger import pqc_logger
from ..monitoring.performance_monitor import performance_monitor

T = TypeVar('T')
R = TypeVar('R')

class BatchStrategy(Enum):
    """Batch processing strategies."""
    SIZE_BASED = "size_based"  # Process when batch reaches target size
    TIME_BASED = "time_based"  # Process after time interval
    HYBRID = "hybrid"  # Combination of size and time based

@dataclass
class BatchConfig:
    """Batch processing configuration."""
    max_batch_size: int = 10
    max_wait_time: float = 1.0  # seconds
    strategy: BatchStrategy = BatchStrategy.HYBRID
    max_concurrent_batches: int = 3
    retry_attempts: int = 2
    retry_delay: float = 0.1

@dataclass
class BatchItem(Generic[T]):
    """Item in a batch with metadata."""
    data: T
    user_id: str
    operation: str
    created_at: float = field(default_factory=time.time)
    attempts: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BatchResult(Generic[R]):
    """Result of batch processing."""
    success: bool
    result: Optional[R] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    batch_size: int = 0

class PQCBatchProcessor(Generic[T, R]):
    """
    Batch processor for PQC operations.
    
    This class provides batch processing capabilities to optimize
    performance when handling multiple PQC operations.
    """
    
    def __init__(self, processor_func: Callable[[List[BatchItem[T]]], List[R]],
                 config: Optional[BatchConfig] = None):
        """
        Initialize PQC batch processor.
        
        Args:
            processor_func: Function to process batches
            config: Batch processing configuration
        """
        self.processor_func = processor_func
        self.config = config or BatchConfig()
        
        self._pending_items: List[BatchItem[T]] = []
        self._processing_batches: Dict[str, asyncio.Task] = {}
        self._results: Dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()
        self._stats = defaultdict(int)
        self._batch_timer: Optional[asyncio.Task] = None
        
        pqc_logger.log_pqc_operation(
            "info",
            "PQC batch processor initialized",
            pqc_operation="batch_processor_init",
            max_batch_size=self.config.max_batch_size,
            max_wait_time=self.config.max_wait_time,
            strategy=self.config.strategy.value
        )
    
    async def submit(self, data: T, user_id: str, operation: str,
                    metadata: Optional[Dict[str, Any]] = None) -> R:
        """
        Submit an item for batch processing.
        
        Args:
            data: Data to process
            user_id: User identifier
            operation: PQC operation name
            metadata: Optional metadata
            
        Returns:
            Processing result
        """
        item = BatchItem(
            data=data,
            user_id=user_id,
            operation=operation,
            metadata=metadata or {}
        )
        
        result_future = asyncio.Future()
        item_id = f"{user_id}_{operation}_{time.time()}_{id(item)}"
        
        async with self._lock:
            self._pending_items.append(item)
            self._results[item_id] = result_future
            self._stats['items_submitted'] += 1
            
            should_process = False
            
            if self.config.strategy == BatchStrategy.SIZE_BASED:
                should_process = len(self._pending_items) >= self.config.max_batch_size
            elif self.config.strategy == BatchStrategy.HYBRID:
                should_process = len(self._pending_items) >= self.config.max_batch_size
            
            if should_process:
                await self._process_batch()
            elif self.config.strategy in [BatchStrategy.TIME_BASED, BatchStrategy.HYBRID]:
                await self._start_timer()
        
        pqc_logger.log_pqc_operation(
            "debug",
            f"Item submitted for batch processing: {user_id}",
            pqc_operation="batch_submit",
            user_id=user_id,
            operation=operation,
            pending_items=len(self._pending_items)
        )
        
        try:
            return await result_future
        except Exception as e:
            self._stats['items_failed'] += 1
            raise
    
    async def _start_timer(self):
        """Start or restart the batch timer."""
        if self._batch_timer and not self._batch_timer.done():
            self._batch_timer.cancel()
        
        self._batch_timer = asyncio.create_task(self._timer_callback())
    
    async def _timer_callback(self):
        """Timer callback to process batch after timeout."""
        try:
            await asyncio.sleep(self.config.max_wait_time)
            
            async with self._lock:
                if self._pending_items:
                    await self._process_batch()
        except asyncio.CancelledError:
            pass
    
    async def _process_batch(self):
        """Process the current batch of items."""
        if not self._pending_items:
            return
        
        if len(self._processing_batches) >= self.config.max_concurrent_batches:
            return
        
        batch_items = self._pending_items[:self.config.max_batch_size]
        self._pending_items = self._pending_items[self.config.max_batch_size:]
        
        if not batch_items:
            return
        
        batch_id = f"batch_{time.time()}_{len(batch_items)}"
        task = asyncio.create_task(self._execute_batch(batch_id, batch_items))
        self._processing_batches[batch_id] = task
        
        self._stats['batches_started'] += 1
        
        pqc_logger.log_pqc_operation(
            "info",
            f"Batch processing started: {batch_id}",
            pqc_operation="batch_start",
            batch_id=batch_id,
            batch_size=len(batch_items),
            pending_items=len(self._pending_items)
        )
    
    async def _execute_batch(self, batch_id: str, batch_items: List[BatchItem[T]]):
        """Execute batch processing."""
        start_time = time.time()
        
        try:
            with performance_monitor.monitor_operation(
                "batch_processing", "system", "batch", 
                {"batch_size": len(batch_items), "batch_id": batch_id}
            ):
                results = await asyncio.get_event_loop().run_in_executor(
                    None, self.processor_func, batch_items
                )
                
                processing_time = time.time() - start_time
                
                for i, (item, result) in enumerate(zip(batch_items, results)):
                    item_id = f"{item.user_id}_{item.operation}_{item.created_at}_{id(item)}"
                    future = self._results.get(item_id)
                    
                    if future and not future.done():
                        if isinstance(result, Exception):
                            future.set_exception(result)
                        else:
                            future.set_result(result)
                
                self._stats['batches_completed'] += 1
                self._stats['items_processed'] += len(batch_items)
                
                pqc_logger.log_pqc_operation(
                    "info",
                    f"Batch processing completed: {batch_id}",
                    pqc_operation="batch_complete",
                    batch_id=batch_id,
                    batch_size=len(batch_items),
                    processing_time=processing_time,
                    success=True
                )
                
        except Exception as e:
            processing_time = time.time() - start_time
            
            for item in batch_items:
                item_id = f"{item.user_id}_{item.operation}_{item.created_at}_{id(item)}"
                future = self._results.get(item_id)
                
                if future and not future.done():
                    item.attempts += 1
                    if item.attempts < self.config.retry_attempts:
                        async with self._lock:
                            self._pending_items.append(item)
                        
                        await asyncio.sleep(self.config.retry_delay)
                        await self._process_batch()
                    else:
                        future.set_exception(Exception(f"Batch processing failed after {item.attempts} attempts: {str(e)}"))
            
            self._stats['batches_failed'] += 1
            
            pqc_logger.log_pqc_operation(
                "error",
                f"Batch processing failed: {batch_id}",
                pqc_operation="batch_error",
                batch_id=batch_id,
                batch_size=len(batch_items),
                processing_time=processing_time,
                error=str(e)
            )
            
        finally:
            async with self._lock:
                self._processing_batches.pop(batch_id, None)
                
                completed_futures = [
                    item_id for item_id, future in self._results.items()
                    if future.done()
                ]
                for item_id in completed_futures:
                    self._results.pop(item_id, None)
    
    async def flush(self):
        """Process all pending items immediately."""
        async with self._lock:
            while self._pending_items:
                await self._process_batch()
        
        if self._processing_batches:
            await asyncio.gather(*self._processing_batches.values(), return_exceptions=True)
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get batch processor statistics.
        
        Returns:
            Dictionary with batch processor statistics
        """
        async with self._lock:
            return {
                "config": {
                    "max_batch_size": self.config.max_batch_size,
                    "max_wait_time": self.config.max_wait_time,
                    "strategy": self.config.strategy.value,
                    "max_concurrent_batches": self.config.max_concurrent_batches
                },
                "current_state": {
                    "pending_items": len(self._pending_items),
                    "processing_batches": len(self._processing_batches),
                    "pending_results": len(self._results)
                },
                "stats": dict(self._stats)
            }

async def batch_process(items: List[T], processor: Callable[[T], R],
                       batch_size: int = 10, max_wait_time: float = 1.0) -> List[R]:
    """
    Simple batch processing utility.
    
    Args:
        items: Items to process
        processor: Function to process individual items
        batch_size: Maximum batch size
        max_wait_time: Maximum wait time for batching
        
    Returns:
        List of processing results
    """
    if not items:
        return []
    
    def batch_processor(batch_items: List[BatchItem[T]]) -> List[R]:
        """Process a batch of items."""
        results = []
        for item in batch_items:
            try:
                result = processor(item.data)
                results.append(result)
            except Exception as e:
                results.append(e)
        return results
    
    config = BatchConfig(
        max_batch_size=batch_size,
        max_wait_time=max_wait_time,
        strategy=BatchStrategy.SIZE_BASED
    )
    
    batch_processor_instance = PQCBatchProcessor(batch_processor, config)
    
    tasks = []
    for i, item in enumerate(items):
        task = batch_processor_instance.submit(
            item, f"user_{i}", "batch_operation"
        )
        tasks.append(task)
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    final_results = []
    for result in results:
        if isinstance(result, Exception):
            final_results.append(result)
        else:
            final_results.append(result)
    
    return final_results

_kyber_batch_processor: Optional[PQCBatchProcessor] = None
_dilithium_batch_processor: Optional[PQCBatchProcessor] = None

def get_kyber_batch_processor() -> PQCBatchProcessor:
    """Get or create Kyber batch processor."""
    global _kyber_batch_processor
    
    if _kyber_batch_processor is None:
        def kyber_processor(batch_items):
            return [f"kyber_result_{item.user_id}" for item in batch_items]
        
        _kyber_batch_processor = PQCBatchProcessor(kyber_processor)
    
    return _kyber_batch_processor

def get_dilithium_batch_processor() -> PQCBatchProcessor:
    """Get or create Dilithium batch processor."""
    global _dilithium_batch_processor
    
    if _dilithium_batch_processor is None:
        def dilithium_processor(batch_items):
            return [f"dilithium_result_{item.user_id}" for item in batch_items]
        
        _dilithium_batch_processor = PQCBatchProcessor(dilithium_processor)
    
    return _dilithium_batch_processor
