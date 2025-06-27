use thiserror::Error;
use std::fmt;
use tracing::{error, warn, info, debug, instrument};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use serde::{Serialize, Deserialize};

#[derive(Error, Debug, Clone, PartialEq)]
pub enum CryptoError {
    #[error("Key generation failed: {reason}")]
    KeyGenerationFailed { reason: String },

    #[error("Invalid key format for {algorithm}: {details}")]
    InvalidKeyFormat { algorithm: String, details: String },

    #[error("Signature verification failed for key ID: {key_id}")]
    SignatureVerificationFailed { key_id: String },

    #[error("Encapsulation failed: {reason}")]
    EncapsulationFailed { reason: String },

    #[error("Decapsulation failed: {reason}")]
    DecapsulationFailed { reason: String },

    #[error("Key not found: {key_id}")]
    KeyNotFound { key_id: String },

    #[error("Key expired: {key_id}, expired at {expiry_time}")]
    KeyExpired { key_id: String, expiry_time: String },

    #[error("Key revoked: {key_id}, revoked at {revocation_time}")]
    KeyRevoked { key_id: String, revocation_time: String },

    #[error("Unsupported algorithm: {algorithm}")]
    UnsupportedAlgorithm { algorithm: String },

    #[error("Memory allocation failed: {size} bytes")]
    MemoryAllocationFailed { size: usize },

    #[error("Hardware feature not available: {feature}")]
    HardwareFeatureUnavailable { feature: String },

    #[error("FFI operation failed: {operation} - {details}")]
    FFIOperationFailed { operation: String, details: String },

    #[error("Serialization error: {details}")]
    SerializationError { details: String },

    #[error("Deserialization error: {details}")]
    DeserializationError { details: String },

    #[error("Configuration error: {parameter} - {details}")]
    ConfigurationError { parameter: String, details: String },

    #[error("Security policy violation: {policy} - {details}")]
    SecurityPolicyViolation { policy: String, details: String },

    #[error("Rate limit exceeded: {operation} - {limit} operations per {window}")]
    RateLimitExceeded { operation: String, limit: u32, window: String },

    #[error("Concurrent operation conflict: {operation} on {resource}")]
    ConcurrentOperationConflict { operation: String, resource: String },

    #[error("Internal error: {details}")]
    InternalError { details: String },
}

impl CryptoError {
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            CryptoError::SecurityPolicyViolation { .. } => ErrorSeverity::Critical,
            CryptoError::KeyRevoked { .. } => ErrorSeverity::Critical,
            CryptoError::SignatureVerificationFailed { .. } => ErrorSeverity::High,
            CryptoError::KeyExpired { .. } => ErrorSeverity::High,
            CryptoError::EncapsulationFailed { .. } => ErrorSeverity::High,
            CryptoError::DecapsulationFailed { .. } => ErrorSeverity::High,
            CryptoError::KeyGenerationFailed { .. } => ErrorSeverity::Medium,
            CryptoError::InvalidKeyFormat { .. } => ErrorSeverity::Medium,
            CryptoError::KeyNotFound { .. } => ErrorSeverity::Medium,
            CryptoError::UnsupportedAlgorithm { .. } => ErrorSeverity::Medium,
            CryptoError::FFIOperationFailed { .. } => ErrorSeverity::Medium,
            CryptoError::RateLimitExceeded { .. } => ErrorSeverity::Medium,
            CryptoError::ConcurrentOperationConflict { .. } => ErrorSeverity::Low,
            CryptoError::MemoryAllocationFailed { .. } => ErrorSeverity::Low,
            CryptoError::HardwareFeatureUnavailable { .. } => ErrorSeverity::Low,
            CryptoError::SerializationError { .. } => ErrorSeverity::Low,
            CryptoError::DeserializationError { .. } => ErrorSeverity::Low,
            CryptoError::ConfigurationError { .. } => ErrorSeverity::Low,
            CryptoError::InternalError { .. } => ErrorSeverity::Medium,
        }
    }

    pub fn error_code(&self) -> &'static str {
        match self {
            CryptoError::KeyGenerationFailed { .. } => "CRYPTO_001",
            CryptoError::InvalidKeyFormat { .. } => "CRYPTO_002",
            CryptoError::SignatureVerificationFailed { .. } => "CRYPTO_003",
            CryptoError::EncapsulationFailed { .. } => "CRYPTO_004",
            CryptoError::DecapsulationFailed { .. } => "CRYPTO_005",
            CryptoError::KeyNotFound { .. } => "CRYPTO_006",
            CryptoError::KeyExpired { .. } => "CRYPTO_007",
            CryptoError::KeyRevoked { .. } => "CRYPTO_008",
            CryptoError::UnsupportedAlgorithm { .. } => "CRYPTO_009",
            CryptoError::MemoryAllocationFailed { .. } => "CRYPTO_010",
            CryptoError::HardwareFeatureUnavailable { .. } => "CRYPTO_011",
            CryptoError::FFIOperationFailed { .. } => "CRYPTO_012",
            CryptoError::SerializationError { .. } => "CRYPTO_013",
            CryptoError::DeserializationError { .. } => "CRYPTO_014",
            CryptoError::ConfigurationError { .. } => "CRYPTO_015",
            CryptoError::SecurityPolicyViolation { .. } => "CRYPTO_016",
            CryptoError::RateLimitExceeded { .. } => "CRYPTO_017",
            CryptoError::ConcurrentOperationConflict { .. } => "CRYPTO_018",
            CryptoError::InternalError { .. } => "CRYPTO_999",
        }
    }

    pub fn is_recoverable(&self) -> bool {
        match self {
            CryptoError::KeyRevoked { .. } => false,
            CryptoError::SecurityPolicyViolation { .. } => false,
            CryptoError::UnsupportedAlgorithm { .. } => false,
            CryptoError::HardwareFeatureUnavailable { .. } => false,
            CryptoError::RateLimitExceeded { .. } => true,
            CryptoError::ConcurrentOperationConflict { .. } => true,
            CryptoError::MemoryAllocationFailed { .. } => true,
            CryptoError::KeyExpired { .. } => true,
            _ => true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

impl fmt::Display for ErrorSeverity {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorSeverity::Low => write!(f, "LOW"),
            ErrorSeverity::Medium => write!(f, "MEDIUM"),
            ErrorSeverity::High => write!(f, "HIGH"),
            ErrorSeverity::Critical => write!(f, "CRITICAL"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub event_type: SecurityEventType,
    pub severity: ErrorSeverity,
    pub timestamp: u64,
    pub details: String,
    pub user_id: Option<String>,
    pub key_id: Option<String>,
    pub operation: Option<String>,
    pub source_ip: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecurityEventType {
    KeyCompromise,
    UnauthorizedAccess,
    SignatureVerificationFailure,
    RateLimitViolation,
    PolicyViolation,
    SuspiciousActivity,
    SystemAnomaly,
}

impl SecurityEvent {
    pub fn new(event_type: SecurityEventType, severity: ErrorSeverity, details: String) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            event_type,
            severity,
            timestamp,
            details,
            user_id: None,
            key_id: None,
            operation: None,
            source_ip: None,
        }
    }

    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_key_id(mut self, key_id: String) -> Self {
        self.key_id = Some(key_id);
        self
    }

    pub fn with_operation(mut self, operation: String) -> Self {
        self.operation = Some(operation);
        self
    }

    pub fn with_source_ip(mut self, source_ip: String) -> Self {
        self.source_ip = Some(source_ip);
        self
    }
}

#[instrument(level = "debug")]
pub fn log_crypto_operation(operation: &str, key_id: &str, duration: Duration, success: bool) {
    if success {
        info!(
            operation = operation,
            key_id = key_id,
            duration_ms = duration.as_millis(),
            status = "success",
            "Crypto operation completed successfully"
        );
    } else {
        warn!(
            operation = operation,
            key_id = key_id,
            duration_ms = duration.as_millis(),
            status = "failed",
            "Crypto operation failed"
        );
    }
}

#[instrument(level = "warn")]
pub fn log_security_event(event: &SecurityEvent) {
    match event.severity {
        ErrorSeverity::Critical => {
            error!(
                event_type = ?event.event_type,
                severity = %event.severity,
                timestamp = event.timestamp,
                details = event.details,
                user_id = event.user_id,
                key_id = event.key_id,
                operation = event.operation,
                source_ip = event.source_ip,
                "CRITICAL security event detected"
            );
        }
        ErrorSeverity::High => {
            error!(
                event_type = ?event.event_type,
                severity = %event.severity,
                timestamp = event.timestamp,
                details = event.details,
                user_id = event.user_id,
                key_id = event.key_id,
                operation = event.operation,
                source_ip = event.source_ip,
                "HIGH severity security event"
            );
        }
        ErrorSeverity::Medium => {
            warn!(
                event_type = ?event.event_type,
                severity = %event.severity,
                timestamp = event.timestamp,
                details = event.details,
                user_id = event.user_id,
                key_id = event.key_id,
                operation = event.operation,
                source_ip = event.source_ip,
                "MEDIUM severity security event"
            );
        }
        ErrorSeverity::Low => {
            info!(
                event_type = ?event.event_type,
                severity = %event.severity,
                timestamp = event.timestamp,
                details = event.details,
                user_id = event.user_id,
                key_id = event.key_id,
                operation = event.operation,
                source_ip = event.source_ip,
                "LOW severity security event"
            );
        }
    }
}

#[instrument(level = "debug")]
pub fn log_performance_metrics(operation: &str, duration: Duration, throughput: Option<f64>) {
    if let Some(ops_per_sec) = throughput {
        info!(
            operation = operation,
            duration_ms = duration.as_millis(),
            throughput_ops_per_sec = ops_per_sec,
            "Performance metrics recorded"
        );
    } else {
        debug!(
            operation = operation,
            duration_ms = duration.as_millis(),
            "Operation timing recorded"
        );
    }
}

#[instrument(level = "error")]
pub fn log_error_with_context(error: &CryptoError, context: &str) {
    error!(
        error_code = error.error_code(),
        error_message = %error,
        severity = %error.severity(),
        recoverable = error.is_recoverable(),
        context = context,
        "Cryptographic error occurred"
    );
}

pub fn log_key_lifecycle_event(key_id: &str, event: &str, algorithm: &str) {
    info!(
        key_id = key_id,
        event = event,
        algorithm = algorithm,
        timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        "Key lifecycle event"
    );
}

pub fn log_memory_usage(operation: &str, bytes_allocated: usize, bytes_freed: usize) {
    debug!(
        operation = operation,
        bytes_allocated = bytes_allocated,
        bytes_freed = bytes_freed,
        net_allocation = bytes_allocated as i64 - bytes_freed as i64,
        "Memory usage tracking"
    );
}

pub fn log_hardware_optimization(feature: &str, enabled: bool, performance_impact: Option<f64>) {
    if enabled {
        info!(
            hardware_feature = feature,
            enabled = enabled,
            performance_impact_percent = performance_impact,
            "Hardware optimization enabled"
        );
    } else {
        warn!(
            hardware_feature = feature,
            enabled = enabled,
            "Hardware optimization not available"
        );
    }
}

#[derive(Debug)]
pub struct ErrorReporter {
    error_count: std::sync::atomic::AtomicU64,
    last_error_time: std::sync::Mutex<Option<SystemTime>>,
}

impl ErrorReporter {
    pub fn new() -> Self {
        Self {
            error_count: std::sync::atomic::AtomicU64::new(0),
            last_error_time: std::sync::Mutex::new(None),
        }
    }

    pub fn report_error(&self, error: &CryptoError, context: &str) {
        self.error_count.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        *self.last_error_time.lock().unwrap() = Some(SystemTime::now());
        
        log_error_with_context(error, context);
        
        if error.severity() == ErrorSeverity::Critical {
            let security_event = SecurityEvent::new(
                SecurityEventType::SystemAnomaly,
                ErrorSeverity::Critical,
                format!("Critical crypto error: {}", error),
            );
            log_security_event(&security_event);
        }
    }

    pub fn get_error_count(&self) -> u64 {
        self.error_count.load(std::sync::atomic::Ordering::Relaxed)
    }

    pub fn get_last_error_time(&self) -> Option<SystemTime> {
        *self.last_error_time.lock().unwrap()
    }
}

impl Default for ErrorReporter {
    fn default() -> Self {
        Self::new()
    }
}

pub type CryptoResult<T> = Result<T, CryptoError>;

#[macro_export]
macro_rules! crypto_ensure {
    ($condition:expr, $error:expr) => {
        if !$condition {
            return Err($error);
        }
    };
}

#[macro_export]
macro_rules! crypto_bail {
    ($error:expr) => {
        return Err($error);
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_severity() {
        let error = CryptoError::SecurityPolicyViolation {
            policy: "key_rotation".to_string(),
            details: "Key rotation overdue".to_string(),
        };
        assert_eq!(error.severity(), ErrorSeverity::Critical);
        assert_eq!(error.error_code(), "CRYPTO_016");
        assert!(!error.is_recoverable());
    }

    #[test]
    fn test_security_event_creation() {
        let event = SecurityEvent::new(
            SecurityEventType::UnauthorizedAccess,
            ErrorSeverity::High,
            "Failed login attempt".to_string(),
        )
        .with_user_id("test_user".to_string())
        .with_source_ip("192.168.1.1".to_string());

        assert_eq!(event.severity, ErrorSeverity::High);
        assert_eq!(event.user_id, Some("test_user".to_string()));
        assert_eq!(event.source_ip, Some("192.168.1.1".to_string()));
    }

    #[test]
    fn test_error_reporter() {
        let reporter = ErrorReporter::new();
        assert_eq!(reporter.get_error_count(), 0);

        let error = CryptoError::KeyNotFound {
            key_id: "test_key".to_string(),
        };
        reporter.report_error(&error, "test context");

        assert_eq!(reporter.get_error_count(), 1);
        assert!(reporter.get_last_error_time().is_some());
    }

    #[test]
    fn test_crypto_macros() {
        fn test_function() -> CryptoResult<()> {
            crypto_ensure!(
                true,
                CryptoError::InternalError {
                    details: "Should not fail".to_string()
                }
            );
            Ok(())
        }

        assert!(test_function().is_ok());

        fn test_function_fail() -> CryptoResult<()> {
            crypto_ensure!(
                false,
                CryptoError::InternalError {
                    details: "Should fail".to_string()
                }
            );
            Ok(())
        }

        assert!(test_function_fail().is_err());
    }

    #[test]
    fn test_error_display() {
        let error = CryptoError::KeyGenerationFailed {
            reason: "Random number generator failed".to_string(),
        };
        let error_string = format!("{}", error);
        assert!(error_string.contains("Key generation failed"));
        assert!(error_string.contains("Random number generator failed"));
    }
}
