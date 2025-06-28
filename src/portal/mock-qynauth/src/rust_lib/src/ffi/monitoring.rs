use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicU64, Ordering};
use std::os::raw::c_int;
use once_cell::sync::Lazy;

pub struct FFIMetrics {
    pub kyber_keygen_count: AtomicU64,
    pub kyber_keygen_total_time: AtomicU64,
    pub kyber_encap_count: AtomicU64,
    pub kyber_encap_total_time: AtomicU64,
    pub kyber_decap_count: AtomicU64,
    pub kyber_decap_total_time: AtomicU64,
    pub dilithium_sign_count: AtomicU64,
    pub dilithium_sign_total_time: AtomicU64,
    pub dilithium_verify_count: AtomicU64,
    pub dilithium_verify_total_time: AtomicU64,
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
            dilithium_sign_count: AtomicU64::new(0),
            dilithium_sign_total_time: AtomicU64::new(0),
            dilithium_verify_count: AtomicU64::new(0),
            dilithium_verify_total_time: AtomicU64::new(0),
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
        self.dilithium_sign_count.store(0, Ordering::Relaxed);
        self.dilithium_sign_total_time.store(0, Ordering::Relaxed);
        self.dilithium_verify_count.store(0, Ordering::Relaxed);
        self.dilithium_verify_total_time.store(0, Ordering::Relaxed);
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
    pub dilithium_sign_avg_nanos: u64,
    pub dilithium_sign_count: u64,
    pub dilithium_verify_avg_nanos: u64,
    pub dilithium_verify_count: u64,
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
        "mldsa_keygen" => FFI_METRICS.record_kyber_keygen(duration),
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
        dilithium_sign_avg_nanos: FFI_METRICS.get_dilithium_sign_avg_time().as_nanos() as u64,
        dilithium_sign_count: FFI_METRICS.dilithium_sign_count.load(Ordering::Relaxed),
        dilithium_verify_avg_nanos: FFI_METRICS.get_dilithium_verify_avg_time().as_nanos() as u64,
        dilithium_verify_count: FFI_METRICS.dilithium_verify_count.load(Ordering::Relaxed),
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
