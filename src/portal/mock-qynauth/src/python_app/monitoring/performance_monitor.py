"""
PQC Performance Monitoring

This module provides comprehensive performance monitoring for Post-Quantum
Cryptography operations with context managers, metrics collection, and reporting.

Compliance:
- NIST SP 800-53 (SI-4): Information System Monitoring
- NIST SP 800-53 (AU-6): Audit Review, Analysis, and Reporting
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

import time
import threading
import statistics
from typing import Dict, Any, List, Optional, Union
from contextlib import contextmanager
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from .pqc_logger import pqc_logger

@dataclass
class OperationMetric:
    """Individual operation metric data."""
    timestamp: float
    operation: str
    user_id: str
    algorithm: str
    duration_ms: float
    success: bool
    memory_usage_mb: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    error_message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class AggregatedMetrics:
    """Aggregated metrics for an operation type."""
    operation: str
    total_count: int
    success_count: int
    failure_count: int
    success_rate: float
    avg_duration_ms: float
    min_duration_ms: float
    max_duration_ms: float
    p95_duration_ms: float
    p99_duration_ms: float
    total_duration_ms: float
    operations_per_second: float
    last_updated: datetime

class PQCPerformanceMonitor:
    """Performance monitoring for PQC operations with comprehensive metrics collection."""
    
    def __init__(self, max_metrics: int = 10000):
        """
        Initialize performance monitor.
        
        Args:
            max_metrics: Maximum number of metrics to store in memory
        """
        self.metrics: Dict[str, List[OperationMetric]] = {}
        self.aggregated_metrics: Dict[str, AggregatedMetrics] = {}
        self.max_metrics = max_metrics
        self.lock = threading.RLock()
        self.start_time = time.time()
        
        self.thresholds = {
            'key_generation': {'max_duration_ms': 1000, 'min_success_rate': 0.95},
            'encapsulation': {'max_duration_ms': 500, 'min_success_rate': 0.98},
            'decapsulation': {'max_duration_ms': 500, 'min_success_rate': 0.98},
            'signature': {'max_duration_ms': 800, 'min_success_rate': 0.95},
            'verification': {'max_duration_ms': 300, 'min_success_rate': 0.98}
        }
    
    @contextmanager
    def monitor_operation(self, operation: str, user_id: str, algorithm: str, 
                         metadata: Optional[Dict[str, Any]] = None):
        """
        Context manager for monitoring PQC operations.
        
        Args:
            operation: Operation name (e.g., 'key_generation', 'encapsulation')
            user_id: User identifier
            algorithm: Cryptographic algorithm (e.g., 'ML-KEM-768', 'ML-DSA-65')
            metadata: Additional operation metadata
            
        Yields:
            OperationContext with timing and resource tracking
        """
        start_time = time.time()
        start_memory = self._get_memory_usage()
        start_cpu = self._get_cpu_usage()
        
        success = False
        error_message = None
        
        try:
            pqc_logger.log_pqc_operation(
                "debug", 
                f"Starting PQC {operation} for user {user_id}",
                pqc_operation=operation,
                user_id=user_id,
                algorithm=algorithm,
                metadata=metadata
            )
            
            yield
            success = True
            
        except Exception as e:
            success = False
            error_message = str(e)
            
            pqc_logger.log_pqc_operation(
                "error",
                f"PQC {operation} failed for user {user_id}: {error_message}",
                pqc_operation=operation,
                user_id=user_id,
                algorithm=algorithm,
                error_message=error_message
            )
            raise
            
        finally:
            end_time = time.time()
            duration_ms = (end_time - start_time) * 1000
            
            end_memory = self._get_memory_usage()
            end_cpu = self._get_cpu_usage()
            
            memory_usage_mb = end_memory - start_memory if start_memory and end_memory else None
            cpu_usage_percent = end_cpu if end_cpu else None
            
            metric = OperationMetric(
                timestamp=start_time,
                operation=operation,
                user_id=user_id,
                algorithm=algorithm,
                duration_ms=duration_ms,
                success=success,
                memory_usage_mb=memory_usage_mb,
                cpu_usage_percent=cpu_usage_percent,
                error_message=error_message,
                metadata=metadata
            )
            
            self._store_metric(metric)
            
            level = "info" if success else "error"
            status = "succeeded" if success else "failed"
            
            pqc_logger.log_pqc_operation(
                level,
                f"PQC {operation} {status} for user {user_id} in {duration_ms:.2f}ms",
                pqc_operation=operation,
                user_id=user_id,
                algorithm=algorithm,
                duration_ms=duration_ms,
                success=success,
                memory_usage_mb=memory_usage_mb,
                performance_metrics={
                    'duration_ms': duration_ms,
                    'memory_usage_mb': memory_usage_mb,
                    'cpu_usage_percent': cpu_usage_percent
                }
            )
            
            self._check_thresholds(operation, duration_ms, success)
    
    def _store_metric(self, metric: OperationMetric):
        """Store metric and update aggregated statistics."""
        with self.lock:
            if metric.operation not in self.metrics:
                self.metrics[metric.operation] = []
            
            self.metrics[metric.operation].append(metric)
            
            if len(self.metrics[metric.operation]) > self.max_metrics:
                self.metrics[metric.operation] = self.metrics[metric.operation][-self.max_metrics:]
            
            self._update_aggregated_metrics(metric.operation)
    
    def _update_aggregated_metrics(self, operation: str):
        """Update aggregated metrics for an operation."""
        metrics = self.metrics.get(operation, [])
        if not metrics:
            return
        
        durations = [m.duration_ms for m in metrics]
        successes = [m for m in metrics if m.success]
        failures = [m for m in metrics if not m.success]
        
        total_count = len(metrics)
        success_count = len(successes)
        failure_count = len(failures)
        success_rate = success_count / total_count if total_count > 0 else 0.0
        
        avg_duration = statistics.mean(durations) if durations else 0.0
        min_duration = min(durations) if durations else 0.0
        max_duration = max(durations) if durations else 0.0
        
        sorted_durations = sorted(durations)
        p95_duration = self._percentile(sorted_durations, 95) if sorted_durations else 0.0
        p99_duration = self._percentile(sorted_durations, 99) if sorted_durations else 0.0
        
        total_duration = sum(durations)
        
        recent_metrics = [m for m in metrics if time.time() - m.timestamp <= 60]
        ops_per_second = len(recent_metrics) / 60.0 if recent_metrics else 0.0
        
        self.aggregated_metrics[operation] = AggregatedMetrics(
            operation=operation,
            total_count=total_count,
            success_count=success_count,
            failure_count=failure_count,
            success_rate=success_rate,
            avg_duration_ms=avg_duration,
            min_duration_ms=min_duration,
            max_duration_ms=max_duration,
            p95_duration_ms=p95_duration,
            p99_duration_ms=p99_duration,
            total_duration_ms=total_duration,
            operations_per_second=ops_per_second,
            last_updated=datetime.utcnow()
        )
    
    def _percentile(self, data: List[float], percentile: float) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0.0
        
        k = (len(data) - 1) * percentile / 100
        f = int(k)
        c = k - f
        
        if f == len(data) - 1:
            return data[f]
        
        return data[f] * (1 - c) + data[f + 1] * c
    
    def _check_thresholds(self, operation: str, duration_ms: float, success: bool):
        """Check if operation meets performance thresholds."""
        thresholds = self.thresholds.get(operation, {})
        
        max_duration = thresholds.get('max_duration_ms')
        if max_duration and duration_ms > max_duration:
            pqc_logger.log_security_event(
                "performance_threshold_exceeded",
                f"Operation {operation} exceeded duration threshold: {duration_ms:.2f}ms > {max_duration}ms",
                severity="warning",
                pqc_operation=operation,
                duration_ms=duration_ms,
                threshold_ms=max_duration
            )
        
        min_success_rate = thresholds.get('min_success_rate')
        if min_success_rate:
            aggregated = self.aggregated_metrics.get(operation)
            if aggregated and aggregated.success_rate < min_success_rate:
                pqc_logger.log_security_event(
                    "success_rate_threshold_exceeded",
                    f"Operation {operation} success rate below threshold: {aggregated.success_rate:.2f} < {min_success_rate}",
                    severity="error",
                    pqc_operation=operation,
                    success_rate=aggregated.success_rate,
                    threshold_rate=min_success_rate
                )
    
    def _get_memory_usage(self) -> Optional[float]:
        """Get current memory usage in MB."""
        try:
            import psutil
            process = psutil.Process()
            return process.memory_info().rss / 1024 / 1024  # Convert to MB
        except ImportError:
            return None
    
    def _get_cpu_usage(self) -> Optional[float]:
        """Get current CPU usage percentage."""
        try:
            import psutil
            return psutil.cpu_percent(interval=0.1)
        except ImportError:
            return None
    
    def get_metrics(self, operation: Optional[str] = None, 
                   since: Optional[datetime] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get stored metrics.
        
        Args:
            operation: Filter by operation name
            since: Filter metrics since this datetime
            
        Returns:
            Dictionary of metrics by operation
        """
        with self.lock:
            result = {}
            
            operations = [operation] if operation else self.metrics.keys()
            since_timestamp = since.timestamp() if since else 0
            
            for op in operations:
                if op in self.metrics:
                    filtered_metrics = [
                        asdict(m) for m in self.metrics[op]
                        if m.timestamp >= since_timestamp
                    ]
                    result[op] = filtered_metrics
            
            return result
    
    def get_aggregated_metrics(self, operation: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """
        Get aggregated metrics.
        
        Args:
            operation: Filter by operation name
            
        Returns:
            Dictionary of aggregated metrics
        """
        with self.lock:
            if operation:
                return {operation: asdict(self.aggregated_metrics[operation])} if operation in self.aggregated_metrics else {}
            
            return {op: asdict(metrics) for op, metrics in self.aggregated_metrics.items()}
    
    def get_performance_report(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance report.
        
        Returns:
            Performance report dictionary
        """
        with self.lock:
            uptime_seconds = time.time() - self.start_time
            
            report = {
                'timestamp': datetime.utcnow().isoformat(),
                'uptime_seconds': uptime_seconds,
                'total_operations': sum(len(metrics) for metrics in self.metrics.values()),
                'operations_summary': {},
                'aggregated_metrics': self.get_aggregated_metrics(),
                'system_info': {
                    'memory_usage_mb': self._get_memory_usage(),
                    'cpu_usage_percent': self._get_cpu_usage()
                }
            }
            
            for operation, metrics in self.metrics.items():
                recent_metrics = [m for m in metrics if time.time() - m.timestamp <= 3600]  # Last hour
                
                report['operations_summary'][operation] = {
                    'total_count': len(metrics),
                    'recent_count': len(recent_metrics),
                    'success_rate': len([m for m in recent_metrics if m.success]) / len(recent_metrics) if recent_metrics else 0,
                    'avg_duration_ms': statistics.mean([m.duration_ms for m in recent_metrics]) if recent_metrics else 0
                }
            
            return report
    
    def reset_metrics(self, operation: Optional[str] = None):
        """
        Reset stored metrics.
        
        Args:
            operation: Reset specific operation metrics, or all if None
        """
        with self.lock:
            if operation:
                self.metrics.pop(operation, None)
                self.aggregated_metrics.pop(operation, None)
            else:
                self.metrics.clear()
                self.aggregated_metrics.clear()
                self.start_time = time.time()
            
            pqc_logger.log_pqc_operation(
                "info",
                f"Performance metrics reset for {operation or 'all operations'}",
                pqc_operation="metrics_reset",
                operation_filter=operation
            )
    
    def export_metrics(self, format: str = "json") -> Union[str, Dict[str, Any]]:
        """
        Export metrics in specified format.
        
        Args:
            format: Export format ('json', 'csv', 'prometheus')
            
        Returns:
            Exported metrics data
        """
        if format.lower() == "json":
            return self.get_performance_report()
        elif format.lower() == "prometheus":
            return self._export_prometheus_format()
        elif format.lower() == "csv":
            return self._export_csv_format()
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def _export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format."""
        lines = []
        
        for operation, aggregated in self.aggregated_metrics.items():
            lines.append(f'pqc_operation_duration_ms{{operation="{operation}"}} {aggregated.avg_duration_ms}')
            lines.append(f'pqc_operation_duration_p95_ms{{operation="{operation}"}} {aggregated.p95_duration_ms}')
            lines.append(f'pqc_operation_duration_p99_ms{{operation="{operation}"}} {aggregated.p99_duration_ms}')
            
            lines.append(f'pqc_operation_total{{operation="{operation}"}} {aggregated.total_count}')
            lines.append(f'pqc_operation_success_total{{operation="{operation}"}} {aggregated.success_count}')
            lines.append(f'pqc_operation_failure_total{{operation="{operation}"}} {aggregated.failure_count}')
            
            lines.append(f'pqc_operation_success_rate{{operation="{operation}"}} {aggregated.success_rate}')
            lines.append(f'pqc_operation_rate_per_second{{operation="{operation}"}} {aggregated.operations_per_second}')
        
        return '\n'.join(lines)
    
    def _export_csv_format(self) -> str:
        """Export metrics in CSV format."""
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'timestamp', 'operation', 'user_id', 'algorithm', 'duration_ms',
            'success', 'memory_usage_mb', 'cpu_usage_percent', 'error_message'
        ])
        
        for operation, metrics in self.metrics.items():
            for metric in metrics:
                writer.writerow([
                    datetime.fromtimestamp(metric.timestamp).isoformat(),
                    metric.operation,
                    metric.user_id,
                    metric.algorithm,
                    metric.duration_ms,
                    metric.success,
                    metric.memory_usage_mb,
                    metric.cpu_usage_percent,
                    metric.error_message
                ])
        
        return output.getvalue()

performance_monitor = PQCPerformanceMonitor()

def monitor_pqc_operation(operation: str, user_id: str, algorithm: str, metadata: Optional[Dict[str, Any]] = None):
    """Convenience function for monitoring PQC operations."""
    return performance_monitor.monitor_operation(operation, user_id, algorithm, metadata)

def get_performance_summary() -> Dict[str, Any]:
    """Get performance summary."""
    return performance_monitor.get_performance_report()

def reset_performance_metrics(operation: Optional[str] = None):
    """Reset performance metrics."""
    performance_monitor.reset_metrics(operation)
