"""
PQC-Specific Logging Configuration

This module provides structured JSON logging specifically for Post-Quantum
Cryptography operations with comprehensive audit trails and compliance support.

Compliance:
- NIST SP 800-53 (AU-3): Audit and Accountability
- NIST SP 800-53 (AU-12): Audit Generation
- ISO/IEC 27701 (7.5.2): Privacy Controls
"""

import logging
import logging.handlers
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class PQCLogFormatter(logging.Formatter):
    """Custom formatter for PQC operations with structured JSON output."""
    
    def format(self, record):
        """
        Format log record as structured JSON.
        
        Args:
            record: LogRecord instance
            
        Returns:
            JSON-formatted log entry
        """
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno,
            'thread': record.thread,
            'process': record.process
        }
        
        if hasattr(record, 'pqc_operation'):
            log_entry['pqc_operation'] = getattr(record, 'pqc_operation', None)
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = getattr(record, 'user_id', None)
        if hasattr(record, 'algorithm'):
            log_entry['algorithm'] = getattr(record, 'algorithm', None)
        if hasattr(record, 'duration_ms'):
            log_entry['duration_ms'] = getattr(record, 'duration_ms', None)
        if hasattr(record, 'key_size'):
            log_entry['key_size'] = getattr(record, 'key_size', None)
        if hasattr(record, 'session_id'):
            log_entry['session_id'] = getattr(record, 'session_id', None)
        if hasattr(record, 'error_code'):
            log_entry['error_code'] = getattr(record, 'error_code', None)
        if hasattr(record, 'performance_metrics'):
            log_entry['performance_metrics'] = getattr(record, 'performance_metrics', None)
        
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info) if record.exc_info else None
            }
        
        log_entry['compliance'] = {
            'audit_category': 'pqc_operations',
            'data_classification': 'internal',
            'retention_period': '7_years'
        }
        
        return json.dumps(log_entry, ensure_ascii=False)

class PQCSecurityFilter(logging.Filter):
    """Filter to prevent logging of sensitive cryptographic material."""
    
    SENSITIVE_PATTERNS = [
        'private_key', 'secret_key', 'shared_secret',
        'password', 'token', 'signature', 'ciphertext'
    ]
    
    def filter(self, record):
        """
        Filter out sensitive information from log records.
        
        Args:
            record: LogRecord instance
            
        Returns:
            True if record should be logged, False otherwise
        """
        message = record.getMessage().lower()
        
        for pattern in self.SENSITIVE_PATTERNS:
            if pattern in message:
                if record.args and len(record.args) > 0:
                    try:
                        first_arg = str(record.args[0]) if record.args[0] is not None else ''
                        record.msg = str(record.msg).replace(first_arg, '[REDACTED]')
                    except (IndexError, TypeError):
                        pass
                break
        
        return True

class PQCLogger:
    """Centralized logging for PQC operations with security and compliance features."""
    
    def __init__(self, name: str = "pqc", log_level: str = "INFO"):
        """
        Initialize PQC logger.
        
        Args:
            name: Logger name
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        """
        self.logger = logging.getLogger(name)
        self.logger.setLevel(getattr(logging, log_level.upper()))
        
        if not self.logger.handlers:
            self._setup_handlers()
        
        security_filter = PQCSecurityFilter()
        self.logger.addFilter(security_filter)
    
    def _setup_handlers(self):
        """Setup logging handlers for console and file output."""
        
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        self.logger.addHandler(console_handler)
        
        log_dir = Path("/tmp/pqc_logs")
        log_dir.mkdir(exist_ok=True)
        
        operations_handler = logging.handlers.RotatingFileHandler(
            log_dir / "pqc_operations.log",
            maxBytes=10*1024*1024,  # 10MB
            backupCount=5
        )
        operations_handler.setLevel(logging.DEBUG)
        operations_handler.setFormatter(PQCLogFormatter())
        self.logger.addHandler(operations_handler)
        
        security_handler = logging.handlers.RotatingFileHandler(
            log_dir / "pqc_security.log",
            maxBytes=5*1024*1024,  # 5MB
            backupCount=10
        )
        security_handler.setLevel(logging.WARNING)
        security_handler.setFormatter(PQCLogFormatter())
        
        class SecurityEventFilter(logging.Filter):
            def filter(self, record):
                return hasattr(record, 'security_event') or record.levelno >= logging.WARNING
        
        security_handler.addFilter(SecurityEventFilter())
        self.logger.addHandler(security_handler)
        
        performance_handler = logging.handlers.RotatingFileHandler(
            log_dir / "pqc_performance.log",
            maxBytes=20*1024*1024,  # 20MB
            backupCount=3
        )
        performance_handler.setLevel(logging.DEBUG)
        performance_handler.setFormatter(PQCLogFormatter())
        
        class PerformanceEventFilter(logging.Filter):
            def filter(self, record):
                return hasattr(record, 'performance_metrics') or hasattr(record, 'duration_ms')
        
        performance_handler.addFilter(PerformanceEventFilter())
        self.logger.addHandler(performance_handler)
    
    def log_pqc_operation(self, level: str, message: str, **kwargs):
        """
        Log PQC operation with structured context.
        
        Args:
            level: Log level (debug, info, warning, error, critical)
            message: Log message
            **kwargs: Additional context (pqc_operation, user_id, algorithm, etc.)
        """
        log_method = getattr(self.logger, level.lower())
        log_method(message, extra=kwargs)
    
    def log_key_generation(self, user_id: str, algorithm: str, duration_ms: float, 
                          success: bool = True, key_size: Optional[int] = None):
        """
        Log key generation operation.
        
        Args:
            user_id: User identifier
            algorithm: Cryptographic algorithm used
            duration_ms: Operation duration in milliseconds
            success: Whether operation succeeded
            key_size: Size of generated key in bytes
        """
        level = "info" if success else "error"
        message = f"PQC key generation {'succeeded' if success else 'failed'} for user {user_id}"
        
        self.log_pqc_operation(
            level, message,
            pqc_operation="key_generation",
            user_id=user_id,
            algorithm=algorithm,
            duration_ms=duration_ms,
            key_size=key_size,
            success=success
        )
    
    def log_encapsulation(self, user_id: str, algorithm: str, duration_ms: float,
                         success: bool = True, ciphertext_size: Optional[int] = None):
        """
        Log encapsulation operation.
        
        Args:
            user_id: User identifier
            algorithm: Cryptographic algorithm used
            duration_ms: Operation duration in milliseconds
            success: Whether operation succeeded
            ciphertext_size: Size of ciphertext in bytes
        """
        level = "info" if success else "error"
        message = f"PQC encapsulation {'succeeded' if success else 'failed'} for user {user_id}"
        
        self.log_pqc_operation(
            level, message,
            pqc_operation="encapsulation",
            user_id=user_id,
            algorithm=algorithm,
            duration_ms=duration_ms,
            ciphertext_size=ciphertext_size,
            success=success
        )
    
    def log_signature(self, user_id: str, algorithm: str, duration_ms: float,
                     success: bool = True, signature_size: Optional[int] = None):
        """
        Log signature operation.
        
        Args:
            user_id: User identifier
            algorithm: Cryptographic algorithm used
            duration_ms: Operation duration in milliseconds
            success: Whether operation succeeded
            signature_size: Size of signature in bytes
        """
        level = "info" if success else "error"
        message = f"PQC signature {'succeeded' if success else 'failed'} for user {user_id}"
        
        self.log_pqc_operation(
            level, message,
            pqc_operation="signature",
            user_id=user_id,
            algorithm=algorithm,
            duration_ms=duration_ms,
            signature_size=signature_size,
            success=success
        )
    
    def log_security_event(self, event_type: str, message: str, user_id: Optional[str] = None,
                          severity: str = "warning", **kwargs):
        """
        Log security-related events.
        
        Args:
            event_type: Type of security event
            message: Event description
            user_id: User identifier if applicable
            severity: Event severity (warning, error, critical)
            **kwargs: Additional context
        """
        self.log_pqc_operation(
            severity, message,
            security_event=event_type,
            user_id=user_id,
            **kwargs
        )
    
    def log_performance_metrics(self, operation: str, metrics: Dict[str, Any],
                               user_id: Optional[str] = None):
        """
        Log performance metrics.
        
        Args:
            operation: Operation name
            metrics: Performance metrics dictionary
            user_id: User identifier if applicable
        """
        message = f"Performance metrics for {operation}"
        
        self.log_pqc_operation(
            "info", message,
            pqc_operation=operation,
            user_id=user_id,
            performance_metrics=metrics
        )
    
    def get_log_stats(self) -> Dict[str, Any]:
        """
        Get logging statistics.
        
        Returns:
            Dictionary with logging statistics
        """
        log_dir = Path("/tmp/pqc_logs")
        stats = {
            "log_directory": str(log_dir),
            "log_files": [],
            "total_size_bytes": 0
        }
        
        if log_dir.exists():
            for log_file in log_dir.glob("*.log*"):
                file_stats = log_file.stat()
                stats["log_files"].append({
                    "name": log_file.name,
                    "size_bytes": file_stats.st_size,
                    "modified": datetime.fromtimestamp(file_stats.st_mtime).isoformat()
                })
                stats["total_size_bytes"] += file_stats.st_size
        
        return stats

pqc_logger = PQCLogger()

def log_pqc_info(message: str, **kwargs):
    """Log PQC info message."""
    pqc_logger.log_pqc_operation("info", message, **kwargs)

def log_pqc_error(message: str, **kwargs):
    """Log PQC error message."""
    pqc_logger.log_pqc_operation("error", message, **kwargs)

def log_pqc_debug(message: str, **kwargs):
    """Log PQC debug message."""
    pqc_logger.log_pqc_operation("debug", message, **kwargs)
