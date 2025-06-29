"""
PQC Monitoring Package

This package provides comprehensive logging and monitoring capabilities
for Post-Quantum Cryptography operations in the enhanced Python bindings.

Modules:
- pqc_logger: Structured JSON logging for PQC operations
- performance_monitor: Performance monitoring with context managers
- integration: Integration with existing Portal Backend monitoring

Compliance:
- NIST SP 800-53 (AU-3): Audit and Accountability
- NIST SP 800-53 (SI-4): Information System Monitoring
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

from .pqc_logger import PQCLogger, pqc_logger
from .performance_monitor import PQCPerformanceMonitor, performance_monitor

__all__ = [
    'PQCLogger',
    'pqc_logger',
    'PQCPerformanceMonitor', 
    'performance_monitor'
]

__version__ = "3.1.0"
__author__ = "Minkalla Quantum-Safe Privacy Portal Team"
