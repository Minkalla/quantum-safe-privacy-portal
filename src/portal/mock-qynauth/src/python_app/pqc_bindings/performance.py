"""
Enhanced Performance Monitoring for PQC Operations

This module provides comprehensive performance monitoring and metrics collection
for Post-Quantum Cryptography operations with integration to existing monitoring systems.

Compliance:
- NIST SP 800-53 (AU-3): Audit and Accountability
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

import logging
import time
import threading
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from collections import defaultdict, deque
from contextlib import contextmanager

from .exceptions import PerformanceError
from .utils import PerformanceTimer, create_operation_metadata

logger = logging.getLogger(__name__)

@dataclass
class OperationMetrics:
    """Metrics for a single PQC operation."""
    operation_name: str
    duration_ms: float
    success: bool
    timestamp: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AggregatedMetrics:
    """Aggregated metrics for an operation type."""
    operation_name: str
    total_operations: int
    successful_operations: int
    failed_operations: int
    avg_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    p95_duration_ms: float
    p99_duration_ms: float
    success_rate: float
    last_updated: float

class PerformanceMonitor:
    """
    Enhanced performance monitoring for PQC operations.
    
    This class provides comprehensive performance tracking with support for
    real-time metrics, historical analysis, and integration with external
    monitoring systems.
    """
    
    def __init__(self, max_history_size: int = 10000, enable_real_time: bool = True):
        """
        Initialize performance monitor.
        
        Args:
            max_history_size: Maximum number of operations to keep in history
            enable_real_time: Enable real-time metrics calculation
        """
        self.max_history_size = max_history_size
        self.enable_real_time = enable_real_time
        
        self._metrics_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=max_history_size))
        self._aggregated_metrics: Dict[str, AggregatedMetrics] = {}
        self._lock = threading.RLock()
        self._start_time = time.time()
        
        logger.info(f"Initialized PerformanceMonitor with history_size={max_history_size}")
    
    def record_operation(self, operation_name: str, duration_ms: float, success: bool, **metadata) -> None:
        """
        Record a completed operation.
        
        Args:
            operation_name: Name of the operation
            duration_ms: Duration in milliseconds
            success: Whether the operation succeeded
            **metadata: Additional metadata
        """
        timestamp = time.time()
        
        metrics = OperationMetrics(
            operation_name=operation_name,
            duration_ms=duration_ms,
            success=success,
            timestamp=timestamp,
            metadata=metadata
        )
        
        with self._lock:
            self._metrics_history[operation_name].append(metrics)
            
            if self.enable_real_time:
                self._update_aggregated_metrics(operation_name)
        
        logger.debug(
            f"Recorded operation: {operation_name}, duration: {duration_ms:.2f}ms, success: {success}",
            extra=create_operation_metadata(operation_name, duration_ms=duration_ms, success=success, **metadata)
        )
    
    @contextmanager
    def measure_operation(self, operation_name: str, **metadata):
        """
        Context manager for measuring operation performance.
        
        Args:
            operation_name: Name of the operation
            **metadata: Additional metadata
            
        Yields:
            PerformanceTimer: Timer object for the operation
        """
        with PerformanceTimer(operation_name) as timer:
            success = False
            try:
                yield timer
                success = True
            except Exception as e:
                logger.error(f"Operation {operation_name} failed: {e}")
                metadata['error'] = str(e)
                raise
            finally:
                self.record_operation(
                    operation_name,
                    timer.get_duration_ms(),
                    success,
                    **metadata
                )
    
    def get_operation_metrics(self, operation_name: str) -> Optional[AggregatedMetrics]:
        """
        Get aggregated metrics for a specific operation.
        
        Args:
            operation_name: Name of the operation
            
        Returns:
            Aggregated metrics or None if operation not found
        """
        with self._lock:
            if operation_name not in self._metrics_history:
                return None
            
            if not self.enable_real_time or operation_name not in self._aggregated_metrics:
                self._update_aggregated_metrics(operation_name)
            
            return self._aggregated_metrics.get(operation_name)
    
    def get_all_metrics(self) -> Dict[str, AggregatedMetrics]:
        """
        Get aggregated metrics for all operations.
        
        Returns:
            Dictionary of operation names to aggregated metrics
        """
        with self._lock:
            result = {}
            for operation_name in self._metrics_history.keys():
                if not self.enable_real_time or operation_name not in self._aggregated_metrics:
                    self._update_aggregated_metrics(operation_name)
                
                if operation_name in self._aggregated_metrics:
                    result[operation_name] = self._aggregated_metrics[operation_name]
            
            return result
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        
        Returns:
            Performance report dictionary
        """
        with self._lock:
            all_metrics = self.get_all_metrics()
            
            total_operations = sum(m.total_operations for m in all_metrics.values())
            total_successful = sum(m.successful_operations for m in all_metrics.values())
            total_failed = sum(m.failed_operations for m in all_metrics.values())
            
            overall_success_rate = (total_successful / total_operations) if total_operations > 0 else 0.0
            
            uptime_seconds = time.time() - self._start_time
            
            report = {
                "summary": {
                    "total_operations": total_operations,
                    "successful_operations": total_successful,
                    "failed_operations": total_failed,
                    "overall_success_rate": overall_success_rate,
                    "uptime_seconds": uptime_seconds,
                    "operations_per_second": total_operations / uptime_seconds if uptime_seconds > 0 else 0.0
                },
                "operations": {},
                "generated_at": time.time()
            }
            
            for operation_name, metrics in all_metrics.items():
                report["operations"][operation_name] = {
                    "total_operations": metrics.total_operations,
                    "success_rate": metrics.success_rate,
                    "avg_duration_ms": metrics.avg_duration_ms,
                    "min_duration_ms": metrics.min_duration_ms,
                    "max_duration_ms": metrics.max_duration_ms,
                    "p95_duration_ms": metrics.p95_duration_ms,
                    "p99_duration_ms": metrics.p99_duration_ms,
                    "last_updated": metrics.last_updated
                }
            
            return report
    
    def reset_metrics(self) -> None:
        """Reset all metrics and history."""
        with self._lock:
            self._metrics_history.clear()
            self._aggregated_metrics.clear()
            self._start_time = time.time()
        
        logger.info("Performance metrics reset")
    
    def get_recent_operations(self, operation_name: str, limit: int = 100) -> List[OperationMetrics]:
        """
        Get recent operations for a specific operation type.
        
        Args:
            operation_name: Name of the operation
            limit: Maximum number of operations to return
            
        Returns:
            List of recent operation metrics
        """
        with self._lock:
            if operation_name not in self._metrics_history:
                return []
            
            history = list(self._metrics_history[operation_name])
            return history[-limit:] if len(history) > limit else history
    
    def _update_aggregated_metrics(self, operation_name: str) -> None:
        """Update aggregated metrics for an operation (called with lock held)."""
        if operation_name not in self._metrics_history:
            return
        
        history = list(self._metrics_history[operation_name])
        if not history:
            return
        
        successful_ops = [op for op in history if op.success]
        failed_ops = [op for op in history if not op.success]
        
        durations = [op.duration_ms for op in history]
        durations.sort()
        
        total_ops = len(history)
        successful_count = len(successful_ops)
        failed_count = len(failed_ops)
        
        avg_duration = sum(durations) / len(durations) if durations else 0.0
        min_duration = min(durations) if durations else 0.0
        max_duration = max(durations) if durations else 0.0
        
        p95_index = int(0.95 * len(durations)) if durations else 0
        p99_index = int(0.99 * len(durations)) if durations else 0
        
        p95_duration = durations[p95_index] if p95_index < len(durations) else max_duration
        p99_duration = durations[p99_index] if p99_index < len(durations) else max_duration
        
        success_rate = successful_count / total_ops if total_ops > 0 else 0.0
        
        self._aggregated_metrics[operation_name] = AggregatedMetrics(
            operation_name=operation_name,
            total_operations=total_ops,
            successful_operations=successful_count,
            failed_operations=failed_count,
            avg_duration_ms=avg_duration,
            min_duration_ms=min_duration,
            max_duration_ms=max_duration,
            p95_duration_ms=p95_duration,
            p99_duration_ms=p99_duration,
            success_rate=success_rate,
            last_updated=time.time()
        )
    
    def check_performance_thresholds(self, thresholds: Dict[str, Dict[str, float]]) -> List[Dict[str, Any]]:
        """
        Check if any operations exceed performance thresholds.
        
        Args:
            thresholds: Dictionary of operation_name -> threshold_metrics
                       Example: {"kyber_keygen": {"max_avg_duration_ms": 100, "min_success_rate": 0.95}}
        
        Returns:
            List of threshold violations
        """
        violations = []
        
        with self._lock:
            for operation_name, operation_thresholds in thresholds.items():
                metrics = self.get_operation_metrics(operation_name)
                if not metrics:
                    continue
                
                for threshold_name, threshold_value in operation_thresholds.items():
                    current_value = None
                    
                    if threshold_name == "max_avg_duration_ms":
                        current_value = metrics.avg_duration_ms
                        violated = current_value > threshold_value
                    elif threshold_name == "max_p95_duration_ms":
                        current_value = metrics.p95_duration_ms
                        violated = current_value > threshold_value
                    elif threshold_name == "min_success_rate":
                        current_value = metrics.success_rate
                        violated = current_value < threshold_value
                    else:
                        continue
                    
                    if violated:
                        violations.append({
                            "operation_name": operation_name,
                            "threshold_name": threshold_name,
                            "threshold_value": threshold_value,
                            "current_value": current_value,
                            "violation_severity": self._calculate_violation_severity(
                                threshold_name, threshold_value, current_value
                            )
                        })
        
        return violations
    
    def _calculate_violation_severity(self, threshold_name: str, threshold_value: float, current_value: float) -> str:
        """Calculate severity of threshold violation."""
        if threshold_name.startswith("max_"):
            ratio = current_value / threshold_value
            if ratio > 2.0:
                return "critical"
            elif ratio > 1.5:
                return "warning"
            else:
                return "minor"
        elif threshold_name.startswith("min_"):
            ratio = current_value / threshold_value
            if ratio < 0.5:
                return "critical"
            elif ratio < 0.75:
                return "warning"
            else:
                return "minor"
        
        return "unknown"

class PQCPerformanceIntegration:
    """Integration layer for PQC performance monitoring with external systems."""
    
    def __init__(self, monitor: PerformanceMonitor):
        """
        Initialize integration layer.
        
        Args:
            monitor: Performance monitor instance
        """
        self.monitor = monitor
        self.logger = logging.getLogger(__name__)
    
    def export_to_prometheus(self) -> str:
        """
        Export metrics in Prometheus format.
        
        Returns:
            Prometheus-formatted metrics string
        """
        metrics = self.monitor.get_all_metrics()
        prometheus_output = []
        
        for operation_name, operation_metrics in metrics.items():
            safe_name = operation_name.replace("-", "_").replace(".", "_")
            
            prometheus_output.extend([
                f"# HELP pqc_{safe_name}_duration_ms Average duration of {operation_name} operations",
                f"# TYPE pqc_{safe_name}_duration_ms gauge",
                f"pqc_{safe_name}_duration_ms {operation_metrics.avg_duration_ms}",
                "",
                f"# HELP pqc_{safe_name}_success_rate Success rate of {operation_name} operations",
                f"# TYPE pqc_{safe_name}_success_rate gauge",
                f"pqc_{safe_name}_success_rate {operation_metrics.success_rate}",
                "",
                f"# HELP pqc_{safe_name}_total Total number of {operation_name} operations",
                f"# TYPE pqc_{safe_name}_total counter",
                f"pqc_{safe_name}_total {operation_metrics.total_operations}",
                ""
            ])
        
        return "\n".join(prometheus_output)
    
    def get_cloudwatch_metrics(self) -> List[Dict[str, Any]]:
        """
        Get metrics in CloudWatch format.
        
        Returns:
            List of CloudWatch metric dictionaries
        """
        metrics = self.monitor.get_all_metrics()
        cloudwatch_metrics = []
        
        for operation_name, operation_metrics in metrics.items():
            cloudwatch_metrics.extend([
                {
                    "MetricName": f"PQC/{operation_name}/Duration",
                    "Value": operation_metrics.avg_duration_ms,
                    "Unit": "Milliseconds",
                    "Timestamp": operation_metrics.last_updated
                },
                {
                    "MetricName": f"PQC/{operation_name}/SuccessRate",
                    "Value": operation_metrics.success_rate * 100,
                    "Unit": "Percent",
                    "Timestamp": operation_metrics.last_updated
                },
                {
                    "MetricName": f"PQC/{operation_name}/TotalOperations",
                    "Value": operation_metrics.total_operations,
                    "Unit": "Count",
                    "Timestamp": operation_metrics.last_updated
                }
            ])
        
        return cloudwatch_metrics
