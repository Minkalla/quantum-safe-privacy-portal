use std::time::{Duration, Instant};
use std::sync::atomic::{AtomicU64, Ordering};
use std::os::raw::c_int;
use once_cell::sync::Lazy;

pub struct FFIMetrics {
    pub mlkem_keygen_count: AtomicU64,
    pub mlkem_keygen_total_time: AtomicU64,
    pub mldsa_sign_count: AtomicU64,
    pub mldsa_sign_total_time: AtomicU64,
    pub mldsa_verify_count: AtomicU64,
    pub mldsa_verify_total_time: AtomicU64,
}

impl FFIMetrics {
    pub fn new() -> Self {
        Self {
            mlkem_keygen_count: AtomicU64::new(0),
            mlkem_keygen_total_time: AtomicU64::new(0),
            mldsa_sign_count: AtomicU64::new(0),
            mldsa_sign_total_time: AtomicU64::new(0),
            mldsa_verify_count: AtomicU64::new(0),
            mldsa_verify_total_time: AtomicU64::new(0),
        }
    }
    
    pub fn record_mlkem_keygen(&self, duration: Duration) {
        self.mlkem_keygen_count.fetch_add(1, Ordering::Relaxed);
        self.mlkem_keygen_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }
    
    pub fn record_mldsa_sign(&self, duration: Duration) {
        self.mldsa_sign_count.fetch_add(1, Ordering::Relaxed);
        self.mldsa_sign_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }
    
    pub fn record_mldsa_verify(&self, duration: Duration) {
        self.mldsa_verify_count.fetch_add(1, Ordering::Relaxed);
        self.mldsa_verify_total_time.fetch_add(duration.as_nanos() as u64, Ordering::Relaxed);
    }
    
    pub fn get_mlkem_keygen_avg_time(&self) -> Duration {
        let count = self.mlkem_keygen_count.load(Ordering::Relaxed);
        let total = self.mlkem_keygen_total_time.load(Ordering::Relaxed);
        
        if count > 0 {
            Duration::from_nanos(total / count)
        } else {
            Duration::from_nanos(0)
        }
    }
    
    pub fn get_mldsa_sign_avg_time(&self) -> Duration {
        let count = self.mldsa_sign_count.load(Ordering::Relaxed);
        let total = self.mldsa_sign_total_time.load(Ordering::Relaxed);
        
        if count > 0 {
            Duration::from_nanos(total / count)
        } else {
            Duration::from_nanos(0)
        }
    }
    
    pub fn get_operation_counts(&self) -> (u64, u64, u64) {
        (
            self.mlkem_keygen_count.load(Ordering::Relaxed),
            self.mldsa_sign_count.load(Ordering::Relaxed),
            self.mldsa_verify_count.load(Ordering::Relaxed),
        )
    }
}

static FFI_METRICS: Lazy<FFIMetrics> = Lazy::new(|| FFIMetrics::new());

pub fn record_operation_time<F, R>(operation: &str, f: F) -> R
where
    F: FnOnce() -> R,
{
    let start = Instant::now();
    let result = f();
    let duration = start.elapsed();
    
    match operation {
        "mlkem_keygen" => FFI_METRICS.record_mlkem_keygen(duration),
        "mldsa_sign" => FFI_METRICS.record_mldsa_sign(duration),
        "mldsa_verify" => FFI_METRICS.record_mldsa_verify(duration),
        _ => {}
    }
    
    result
}

#[no_mangle]
pub extern "C" fn ffi_enable_optimizations(flags: u32) -> c_int {
    0
}

#[no_mangle]
pub extern "C" fn ffi_get_operation_counts(
    mlkem_keygen_count: *mut u64,
    mldsa_sign_count: *mut u64,
    mldsa_verify_count: *mut u64,
) -> c_int {
    if mlkem_keygen_count.is_null() || mldsa_sign_count.is_null() || mldsa_verify_count.is_null() {
        return -1;
    }
    
    let (keygen, sign, verify) = FFI_METRICS.get_operation_counts();
    
    unsafe {
        *mlkem_keygen_count = keygen;
        *mldsa_sign_count = sign;
        *mldsa_verify_count = verify;
    }
    
    0
}

#[no_mangle]
pub extern "C" fn ffi_get_avg_operation_times(
    mlkem_keygen_ns: *mut u64,
    mldsa_sign_ns: *mut u64,
) -> c_int {
    if mlkem_keygen_ns.is_null() || mldsa_sign_ns.is_null() {
        return -1;
    }
    
    unsafe {
        *mlkem_keygen_ns = FFI_METRICS.get_mlkem_keygen_avg_time().as_nanos() as u64;
        *mldsa_sign_ns = FFI_METRICS.get_mldsa_sign_avg_time().as_nanos() as u64;
    }
    
    0
}
