pub mod memory;
pub mod mldsa_ffi;
pub mod mlkem_ffi;
pub mod monitoring;

pub use memory::{
    ffi_buffer_free, ffi_get_last_error_message, validate_buffer_params, FFIBuffer, FFIErrorCode,
};
pub use mldsa_ffi::{
    mldsa_keypair_free, mldsa_keypair_generate, mldsa_sign, mldsa_verify, CMLDSAKeyPair,
};
pub use mlkem_ffi::{
    mlkem_decapsulate, mlkem_encapsulate, mlkem_keypair_free, mlkem_keypair_generate, CMLKEMKeyPair,
};
pub use monitoring::{ffi_enable_optimizations, record_operation_time, FFIMetrics};
