pub mod memory;
pub mod mlkem_ffi;
pub mod mldsa_ffi;
pub mod monitoring;

pub use memory::{FFIBuffer, FFIErrorCode, validate_buffer_params, ffi_buffer_free, ffi_get_last_error_message};
pub use mlkem_ffi::{CMLKEMKeyPair, mlkem_keypair_generate, mlkem_encapsulate, mlkem_decapsulate, mlkem_keypair_free};
pub use mldsa_ffi::{CMLDSAKeyPair, mldsa_keypair_generate, mldsa_sign, mldsa_verify, mldsa_keypair_free};
pub use monitoring::{FFIMetrics, record_operation_time, ffi_enable_optimizations};
