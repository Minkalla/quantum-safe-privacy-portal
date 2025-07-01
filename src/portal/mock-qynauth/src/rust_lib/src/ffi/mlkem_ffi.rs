use crate::ffi::memory::{safe_slice_from_raw, set_last_error, FFIBuffer, FFIErrorCode};
use crate::ffi::monitoring::record_operation_time;
use crate::{
    generate_mlkem_keypair, mlkem_decapsulate as core_mlkem_decapsulate,
    mlkem_encapsulate as core_mlkem_encapsulate,
};
use libc::size_t;
use secrecy::ExposeSecret;
use std::os::raw::c_int;

#[repr(C)]
pub struct CMLKEMKeyPair {
    pub public_key_ptr: *mut u8,
    pub public_key_len: size_t,
    pub secret_key_ptr: *mut u8,
    pub secret_key_len: size_t,
}

#[no_mangle]
pub extern "C" fn mlkem_keypair_generate() -> *mut CMLKEMKeyPair {
    record_operation_time("mlkem_keygen", || match generate_mlkem_keypair() {
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
                    public_key.len(),
                );
                std::ptr::copy_nonoverlapping(
                    secret_key.as_ptr(),
                    secret_buffer.as_mut_ptr(),
                    secret_key.len(),
                );
            }

            let keypair = Box::new(CMLKEMKeyPair {
                public_key_ptr: public_buffer.into_raw(),
                public_key_len: public_key.len(),
                secret_key_ptr: secret_buffer.into_raw(),
                secret_key_len: secret_key.len(),
            });

            Box::into_raw(keypair)
        }
        Err(e) => {
            set_last_error(&format!("ML-KEM keypair generation failed: {e}"));
            std::ptr::null_mut()
        }
    })
}

#[no_mangle]
pub extern "C" fn mlkem_encapsulate(
    public_key_ptr: *const u8,
    public_key_len: size_t,
    shared_secret_out: *mut *mut u8,
    shared_secret_len_out: *mut size_t,
    ciphertext_out: *mut *mut u8,
    ciphertext_len_out: *mut size_t,
) -> c_int {
    if shared_secret_out.is_null()
        || shared_secret_len_out.is_null()
        || ciphertext_out.is_null()
        || ciphertext_len_out.is_null()
    {
        set_last_error("Output parameters cannot be null");
        return FFIErrorCode::InvalidInput as c_int;
    }

    let public_key_slice = match safe_slice_from_raw(public_key_ptr, public_key_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid public key buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };

    record_operation_time("mlkem_encap", || {
        match core_mlkem_encapsulate(public_key_slice, b"") {
            Ok(result) => {
                let shared_secret = result.shared_secret.expose_secret();
                let ciphertext = result.ciphertext;

                let mut ss_buffer = match FFIBuffer::new(shared_secret.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate shared secret buffer: {e}"));
                        return FFIErrorCode::AllocationFailed as c_int;
                    }
                };

                let mut ct_buffer = match FFIBuffer::new(ciphertext.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate ciphertext buffer: {e}"));
                        return FFIErrorCode::AllocationFailed as c_int;
                    }
                };

                unsafe {
                    std::ptr::copy_nonoverlapping(
                        shared_secret.as_ptr(),
                        ss_buffer.as_mut_ptr(),
                        shared_secret.len(),
                    );
                    std::ptr::copy_nonoverlapping(
                        ciphertext.as_ptr(),
                        ct_buffer.as_mut_ptr(),
                        ciphertext.len(),
                    );

                    *shared_secret_out = ss_buffer.into_raw();
                    *shared_secret_len_out = shared_secret.len();
                    *ciphertext_out = ct_buffer.into_raw();
                    *ciphertext_len_out = ciphertext.len();
                }

                FFIErrorCode::Success as c_int
            }
            Err(e) => {
                set_last_error(&format!("ML-KEM encapsulation failed: {e}"));
                FFIErrorCode::CryptoError as c_int
            }
        }
    })
}

#[no_mangle]
pub extern "C" fn mlkem_decapsulate(
    secret_key_ptr: *const u8,
    secret_key_len: size_t,
    ciphertext_ptr: *const u8,
    ciphertext_len: size_t,
    shared_secret_out: *mut *mut u8,
    shared_secret_len_out: *mut size_t,
) -> c_int {
    if shared_secret_out.is_null() || shared_secret_len_out.is_null() {
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

    let ciphertext_slice = match safe_slice_from_raw(ciphertext_ptr, ciphertext_len) {
        Ok(slice) => slice,
        Err(e) => {
            set_last_error(&format!("Invalid ciphertext buffer: {e}"));
            return FFIErrorCode::InvalidInput as c_int;
        }
    };

    record_operation_time("mlkem_decap", || {
        match core_mlkem_decapsulate(secret_key_slice, ciphertext_slice) {
            Ok(shared_secret) => {
                let shared_secret_bytes = shared_secret.expose_secret();

                let mut ss_buffer = match FFIBuffer::new(shared_secret_bytes.len()) {
                    Ok(buf) => buf,
                    Err(e) => {
                        set_last_error(&format!("Failed to allocate shared secret buffer: {e}"));
                        return FFIErrorCode::AllocationFailed as c_int;
                    }
                };

                unsafe {
                    std::ptr::copy_nonoverlapping(
                        shared_secret_bytes.as_ptr(),
                        ss_buffer.as_mut_ptr(),
                        shared_secret_bytes.len(),
                    );

                    *shared_secret_out = ss_buffer.into_raw();
                    *shared_secret_len_out = shared_secret_bytes.len();
                }

                FFIErrorCode::Success as c_int
            }
            Err(e) => {
                set_last_error(&format!("ML-KEM decapsulation failed: {e}"));
                FFIErrorCode::CryptoError as c_int
            }
        }
    })
}

#[no_mangle]
pub extern "C" fn mlkem_keypair_free(keypair: *mut CMLKEMKeyPair) {
    if !keypair.is_null() {
        unsafe {
            let keypair = Box::from_raw(keypair);

            if !keypair.public_key_ptr.is_null() && keypair.public_key_len > 0 {
                let layout = std::alloc::Layout::array::<u8>(keypair.public_key_len).unwrap();
                let slice =
                    std::slice::from_raw_parts_mut(keypair.public_key_ptr, keypair.public_key_len);
                slice.fill(0);
                std::alloc::dealloc(keypair.public_key_ptr, layout);
            }

            if !keypair.secret_key_ptr.is_null() && keypair.secret_key_len > 0 {
                let layout = std::alloc::Layout::array::<u8>(keypair.secret_key_len).unwrap();
                let slice =
                    std::slice::from_raw_parts_mut(keypair.secret_key_ptr, keypair.secret_key_len);
                slice.fill(0);
                std::alloc::dealloc(keypair.secret_key_ptr, layout);
            }
        }
    }
}
