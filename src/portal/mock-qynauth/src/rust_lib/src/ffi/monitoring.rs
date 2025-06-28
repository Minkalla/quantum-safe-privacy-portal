use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicU64, Ordering};
use std::os::raw::c_int;
use once_cell::sync::Lazy;
use std::fs::OpenOptions;
use std::io::Write;

pub struct FFIMetrics {
    pub kyber_keygen_count: AtomicU64,
    pub kyber_keygen_total_time: AtomicU64,
    pub kyber_encap_count: AtomicU64,
    pub kyber_encap_total_time: AtomicU64,
    pub kyber_decap_count: AtomicU64,
    pub kyber_decap_total_time: AtomicU64,
    pub dilithium_keygen_count: AtomicU64,
    pub dilithium_keygen_total_time: AtomicU64,
    pub dilithium_sign_count: AtomicU64,
    pub dilithium_sign_total_time: AtomicU64,
    pub dilithium_verify_count: AtomicU64,
    pub dilithium_verify_total_time: AtomicU64,
    pub memory_usage_bytes: AtomicU64,
    pub error_count: AtomicU64,
    pub throughput_ops_per_sec: AtomicU64,
    pub baseline_violations: AtomicU64,
}

impl Default for FFIMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl FFIMetrics {
    pub fn new() -> Self {
        Self {
            kyber_keygen_count: AtomicU64::new(0),
            kyber_keygen_total_time: AtomicU64::new(0),
            kyber_encap_count: AtomicU64::new(0),
            kyber_encap_total_time: AtomicU64::new(0),
            kyber_decap_count: AtomicU64::new(0),
            kyber_decap_total_time: AtomicU64::new(0),
            dilithium_keygen_count: AtomicU64::new(0),
            dilithium_keygen_total_time: AtomicU64::new(0),
            dilithium_sign_count: AtomicU64::new(0),
            dilithium_sign_total_time: AtomicU64::new(0),
            dilithium_verify_count: AtomicU64::new(0),
            dilithium_verify_total_time: AtomicU64::new(0),
            memory_usage_bytes: AtomicU64::new(0),
            error_count: AtomicU64::new(0),
            throughput_ops_per_sec: AtomicU64::new(0),
            baseline_violations: AtomicU64::new(0),
        }
    }
    
    pub fn record_kyber_keygen(&self, duration: Duration) {
        self.kyber_keygen_count.fetch_add(1, Ordering::Relaxed);
        self.kyber_keygen_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_kyber_keygen_avg_time(&self) -> Duration {
        let count = self.kyber_keygen_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.kyber_keygen_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }

    pub fn record_kyber_encap(&self, duration: Duration) {
        self.kyber_encap_count.fetch_add(1, Ordering::Relaxed);
        self.kyber_encap_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_kyber_encap_avg_time(&self) -> Duration {
        let count = self.kyber_encap_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.kyber_encap_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }

    pub fn record_kyber_decap(&self, duration: Duration) {
        self.kyber_decap_count.fetch_add(1, Ordering::Relaxed);
        self.kyber_decap_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_kyber_decap_avg_time(&self) -> Duration {
        let count = self.kyber_decap_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.kyber_decap_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }
    
    pub fn record_dilithium_sign(&self, duration: Duration) {
        self.dilithium_sign_count.fetch_add(1, Ordering::Relaxed);
        self.dilithium_sign_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_dilithium_sign_avg_time(&self) -> Duration {
        let count = self.dilithium_sign_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.dilithium_sign_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }
    
    pub fn record_dilithium_keygen(&self, duration: Duration) {
        self.dilithium_keygen_count.fetch_add(1, Ordering::Relaxed);
        self.dilithium_keygen_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_dilithium_keygen_avg_time(&self) -> Duration {
        let count = self.dilithium_keygen_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.dilithium_keygen_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }
    
    pub fn record_dilithium_verify(&self, duration: Duration) {
        self.dilithium_verify_count.fetch_add(1, Ordering::Relaxed);
        self.dilithium_verify_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }

    pub fn get_dilithium_verify_avg_time(&self) -> Duration {
        let count = self.dilithium_verify_count.load(Ordering::Relaxed);
        if count == 0 {
            return Duration::from_nanos(0);
        }
        let total_nanos = self.dilithium_verify_total_time.load(Ordering::Relaxed);
        Duration::from_nanos(total_nanos / count)
    }

    pub fn reset_metrics(&self) {
        self.kyber_keygen_count.store(0, Ordering::Relaxed);
        self.kyber_keygen_total_time.store(0, Ordering::Relaxed);
        self.kyber_encap_count.store(0, Ordering::Relaxed);
        self.kyber_encap_total_time.store(0, Ordering::Relaxed);
        self.kyber_decap_count.store(0, Ordering::Relaxed);
        self.kyber_decap_total_time.store(0, Ordering::Relaxed);
        self.dilithium_keygen_count.store(0, Ordering::Relaxed);
        self.dilithium_keygen_total_time.store(0, Ordering::Relaxed);
        self.dilithium_sign_count.store(0, Ordering::Relaxed);
        self.dilithium_sign_total_time.store(0, Ordering::Relaxed);
        self.dilithium_verify_count.store(0, Ordering::Relaxed);
        self.dilithium_verify_total_time.store(0, Ordering::Relaxed);
        self.memory_usage_bytes.store(0, Ordering::Relaxed);
        self.error_count.store(0, Ordering::Relaxed);
        self.throughput_ops_per_sec.store(0, Ordering::Relaxed);
        self.baseline_violations.store(0, Ordering::Relaxed);
    }
    
    pub fn record_memory_usage(&self, bytes: u64) {
        self.memory_usage_bytes.store(bytes, Ordering::Relaxed);
    }
    
    pub fn record_error(&self) {
        self.error_count.fetch_add(1, Ordering::Relaxed);
    }
    
    pub fn record_throughput(&self, ops_per_sec: u64) {
        self.throughput_ops_per_sec.store(ops_per_sec, Ordering::Relaxed);
    }
    
    pub fn record_baseline_violation(&self) {
        self.baseline_violations.fetch_add(1, Ordering::Relaxed);
    }
    
    pub fn get_memory_usage(&self) -> u64 {
        self.memory_usage_bytes.load(Ordering::Relaxed)
    }
    
    pub fn get_error_count(&self) -> u64 {
        self.error_count.load(Ordering::Relaxed)
    }
    
    pub fn get_throughput(&self) -> u64 {
        self.throughput_ops_per_sec.load(Ordering::Relaxed)
    }
    
    pub fn get_baseline_violations(&self) -> u64 {
        self.baseline_violations.load(Ordering::Relaxed)
    }
    
    pub fn generate_monitoring_report(&self) -> String {
        format!(
            "=== PQC Performance Monitoring Report ===\n\
            Generated: {}\n\
            WBS 2.5.2: Performance Monitoring Infrastructure\n\n\
            ML-KEM Operations:\n\
            - Key Generation: {} ops, avg {:?}\n\
            - Encapsulation: {} ops, avg {:?}\n\
            - Decapsulation: {} ops, avg {:?}\n\n\
            ML-DSA Operations:\n\
            - Key Generation: {} ops, avg {:?}\n\
            - Signing: {} ops, avg {:?}\n\
            - Verification: {} ops, avg {:?}\n\n\
            System Metrics:\n\
            - Memory Usage: {} bytes\n\
            - Error Count: {}\n\
            - Throughput: {} ops/sec\n\
            - Baseline Violations: {}\n",
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
            self.kyber_keygen_count.load(Ordering::Relaxed),
            self.get_kyber_keygen_avg_time(),
            self.kyber_encap_count.load(Ordering::Relaxed),
            self.get_kyber_encap_avg_time(),
            self.kyber_decap_count.load(Ordering::Relaxed),
            self.get_kyber_decap_avg_time(),
            self.dilithium_keygen_count.load(Ordering::Relaxed),
            self.get_dilithium_keygen_avg_time(),
            self.dilithium_sign_count.load(Ordering::Relaxed),
            self.get_dilithium_sign_avg_time(),
            self.dilithium_verify_count.load(Ordering::Relaxed),
            self.get_dilithium_verify_avg_time(),
            self.get_memory_usage(),
            self.get_error_count(),
            self.get_throughput(),
            self.get_baseline_violations()
        )
    }
    
    pub fn export_to_monitoring_file(&self) -> Result<(), std::io::Error> {
        let report = self.generate_monitoring_report();
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open("/tmp/pqc_performance/monitoring/real_time_metrics.txt")?;
        writeln!(file, "{}", report)?;
        Ok(())
    }
}

static FFI_METRICS: Lazy<FFIMetrics> = Lazy::new(FFIMetrics::new);

#[repr(C)]
pub struct FFIPerformanceReport {
    pub kyber_keygen_avg_nanos: u64,
    pub kyber_keygen_count: u64,
    pub kyber_encap_avg_nanos: u64,
    pub kyber_encap_count: u64,
    pub kyber_decap_avg_nanos: u64,
    pub kyber_decap_count: u64,
    pub dilithium_keygen_avg_nanos: u64,
    pub dilithium_keygen_count: u64,
    pub dilithium_sign_avg_nanos: u64,
    pub dilithium_sign_count: u64,
    pub dilithium_verify_avg_nanos: u64,
    pub dilithium_verify_count: u64,
    pub memory_usage_bytes: u64,
    pub error_count: u64,
    pub throughput_ops_per_sec: u64,
    pub baseline_violations: u64,
}

pub fn record_operation_time<F, R>(operation: &str, f: F) -> R
where
    F: FnOnce() -> R,
{
    let start = Instant::now();
    let result = f();
    let duration = start.elapsed();
    
    match operation {
        "mlkem_keygen" => FFI_METRICS.record_kyber_keygen(duration),
        "mlkem_encap" => FFI_METRICS.record_kyber_encap(duration),
        "mlkem_decap" => FFI_METRICS.record_kyber_decap(duration),
        "mldsa_keygen" => FFI_METRICS.record_dilithium_keygen(duration),
        "mldsa_sign" => FFI_METRICS.record_dilithium_sign(duration),
        "mldsa_verify" => FFI_METRICS.record_dilithium_verify(duration),
        _ => {}
    }
    
    result
}

#[no_mangle]
pub extern "C" fn ffi_enable_optimizations(_flags: u32) -> c_int {
    0
}

#[no_mangle]
pub extern "C" fn ffi_get_performance_metrics() -> *const FFIPerformanceReport {
    let report = Box::new(FFIPerformanceReport {
        kyber_keygen_avg_nanos: FFI_METRICS.get_kyber_keygen_avg_time().as_nanos() as u64,
        kyber_keygen_count: FFI_METRICS.kyber_keygen_count.load(Ordering::Relaxed),
        kyber_encap_avg_nanos: FFI_METRICS.get_kyber_encap_avg_time().as_nanos() as u64,
        kyber_encap_count: FFI_METRICS.kyber_encap_count.load(Ordering::Relaxed),
        kyber_decap_avg_nanos: FFI_METRICS.get_kyber_decap_avg_time().as_nanos() as u64,
        kyber_decap_count: FFI_METRICS.kyber_decap_count.load(Ordering::Relaxed),
        dilithium_keygen_avg_nanos: FFI_METRICS.get_dilithium_keygen_avg_time().as_nanos() as u64,
        dilithium_keygen_count: FFI_METRICS.dilithium_keygen_count.load(Ordering::Relaxed),
        dilithium_sign_avg_nanos: FFI_METRICS.get_dilithium_sign_avg_time().as_nanos() as u64,
        dilithium_sign_count: FFI_METRICS.dilithium_sign_count.load(Ordering::Relaxed),
        dilithium_verify_avg_nanos: FFI_METRICS.get_dilithium_verify_avg_time().as_nanos() as u64,
        dilithium_verify_count: FFI_METRICS.dilithium_verify_count.load(Ordering::Relaxed),
        memory_usage_bytes: FFI_METRICS.get_memory_usage(),
        error_count: FFI_METRICS.get_error_count(),
        throughput_ops_per_sec: FFI_METRICS.get_throughput(),
        baseline_violations: FFI_METRICS.get_baseline_violations(),
    });

    Box::into_raw(report)
}

#[no_mangle]
pub extern "C" fn ffi_free_performance_report(report: *mut FFIPerformanceReport) {
    if !report.is_null() {
        unsafe {
            let _ = Box::from_raw(report);
        }
    }
}

#[no_mangle]
pub extern "C" fn ffi_reset_metrics() -> c_int {
    FFI_METRICS.reset_metrics();
    0
}

#[no_mangle]
pub extern "C" fn ffi_record_memory_usage(bytes: u64) -> c_int {
    FFI_METRICS.record_memory_usage(bytes);
    0
}

#[no_mangle]
pub extern "C" fn ffi_record_error() -> c_int {
    FFI_METRICS.record_error();
    0
}

#[no_mangle]
pub extern "C" fn ffi_record_throughput(ops_per_sec: u64) -> c_int {
    FFI_METRICS.record_throughput(ops_per_sec);
    0
}

#[no_mangle]
pub extern "C" fn ffi_record_baseline_violation() -> c_int {
    FFI_METRICS.record_baseline_violation();
    0
}

#[no_mangle]
pub extern "C" fn ffi_export_monitoring_report() -> c_int {
    match FFI_METRICS.export_to_monitoring_file() {
        Ok(_) => 0,
        Err(_) => -1,
    }
}
