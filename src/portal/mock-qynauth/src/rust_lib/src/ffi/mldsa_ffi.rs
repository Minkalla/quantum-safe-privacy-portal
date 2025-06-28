use std::os::raw::c_int;
use libc::size_t;
use crate::{generate_mldsa_keypair, mldsa_sign as core_mldsa_sign, mldsa_verify as core_mldsa_verify};
use crate::ffi::memory::{FFIBuffer, FFIErrorCode, safe_slice_from_raw, set_last_error};
use crate::ffi::monitoring::record_operation_time;
use secrecy::ExposeSecret;

#[repr(C)]
pub struct CMLDSAKeyPair {
    pub public_key_ptr: *mut u8,
    pub public_key_len: size_t,
    pub secret_key_ptr: *mut u8,
    pub secret_key_len: size_t,
}

#[no_mangle]
pub extern "C" fn mldsa_keypair_generate() -> *mut CMLDSAKeyPair {
    record_operation_time("mldsa_keygen", || {
        match generate_mldsa_keypair() {
            Ok(keypair) => {
                let public_key = keypair.public_key;
                let secret_key = keypair.private_key.expose_secret().clone();
                
                let mut public_buffer = match FFIBuffer::new(public_key.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate public key buffer: {e}"));
                        return std::ptr::null_mut();
                    }
                };
                
                let mut secret_buffer = match FFIBuffer::new(secret_key.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate secret key buffer: {e}"));
                        return std::ptr::null_mut();
                    }
                };
                
                unsafe {
                    std::ptr::copy_nonoverlapping(
                        public_key.as_ptr(),
                        public_buffer.as_mut_ptr(),
                        public_key.len()
                    );
                    std::ptr::copy_nonoverlapping(
                        secret_key.as_ptr(),
                        secret_buffer.as_mut_ptr(),
                        secret_key.len()
                    );
                }
                
                let keypair = Box::new(CMLDSAKeyPair {
                    public_key_ptr: public_buffer.into_raw(),
                    public_key_len: public_key.len(),
                    secret_key_ptr: secret_buffer.into_raw(),
                    secret_key_len: secret_key.len(),
                });
                
                Box::into_raw(keypair)
            },
            Err(e) => {
                set_last_error(&format!("ML-DSA keypair generation failed: {e}"));
                std::ptr::null_mut()
            }
        }
    })
}

#[no_mangle]
pub extern "C" fn mldsa_sign(
    secret_key_ptr: *const u8,
    secret_key_len: size_t,
    message_ptr: *const u8,
    message_len: size_t,
    signature_out: *mut *mut u8,
    signature_len_out: *mut size_t,
) -> c_int {
    if signature_out.is_null() || signature_len_out.is_null() {
        set_last_error("Output parameters cannot be null");
        return FFIErrorCode::InvalidInput as c_int;
    }
    
    let secret_key_slice = match safe_slice_from_raw(secret_key_ptr, secret_key_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid secret key buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };
    
    let message_slice = match safe_slice_from_raw(message_ptr, message_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid message buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };
    
    record_operation_time("mldsa_sign", || {
        match core_mldsa_sign(secret_key_slice, message_slice) {
            Ok(signature_result) => {
                let signature = signature_result.signature.expose_secret();
                
                let mut sig_buffer = match FFIBuffer::new(signature.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate signature buffer: {e}"));
                        return FFIErrorCode::AllocationFailed as c_int;
                    }
                };
                
                unsafe {
                    std::ptr::copy_nonoverlapping(
                        signature.as_ptr(),
                        sig_buffer.as_mut_ptr(),
                        signature.len()
                    );
                    
                    *signature_out = sig_buffer.into_raw();
                    *signature_len_out = signature.len();
                }
                
                FFIErrorCode::Success as c_int
            },
            Err(e) => {
                set_last_error(&format!("ML-DSA signing failed: {e}"));
                FFIErrorCode::CryptoError as c_int
            }
        }
    })
}

#[no_mangle]
pub extern "C" fn mldsa_verify(
    public_key_ptr: *const u8,
    public_key_len: size_t,
    message_ptr: *const u8,
    message_len: size_t,
    signature_ptr: *const u8,
    signature_len: size_t,
) -> c_int {
    let public_key_slice = match safe_slice_from_raw(public_key_ptr, public_key_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid public key buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };
    
    let message_slice = match safe_slice_from_raw(message_ptr, message_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid message buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };
    
    let signature_slice = match safe_slice_from_raw(signature_ptr, signature_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid signature buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };
    
    match core_mldsa_verify(public_key_slice, message_slice, signature_slice) {
        Ok(is_valid) => {
            if is_valid {
                FFIErrorCode::Success as c_int
            } else {
                set_last_error("Signature verification failed");
                FFIErrorCode::SignatureVerificationFailed as c_int
            }
        },
        Err(e) => {
            set_last_error(&format!("ML-DSA verification failed: {e}"));
            FFIErrorCode::CryptoError as c_int
        }
    }
}

#[no_mangle]
pub extern "C" fn mldsa_keypair_free(keypair: *mut CMLDSAKeyPair) {
    if !keypair.is_null() {
        unsafe {
            let keypair = Box::from_raw(keypair);
            
            if !keypair.public_key_ptr.is_null() && keypair.public_key_len > 0 {
                let layout = std::alloc::Layout::array::<u8>(keypair.public_key_len).unwrap();
                let slice = std::slice::from_raw_parts_mut(keypair.public_key_ptr, keypair.public_key_len);
                slice.fill(0);
                std::alloc::dealloc(keypair.public_key_ptr, layout);
            }
            
            if !keypair.secret_key_ptr.is_null() && keypair.secret_key_len > 0 {
                let layout = std::alloc::Layout::array::<u8>(keypair.secret_key_len).unwrap();
                let slice = std::slice::from_raw_parts_mut(keypair.secret_key_ptr, keypair.secret_key_len);
                slice.fill(0);
                std::alloc::dealloc(keypair.secret_key_ptr, layout);
            }
        }
    }
}
