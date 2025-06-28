use crate::ffi::memory::FFIErrorCode;
use libc::size_t;
use pqcrypto_mlkem::mlkem768;
use pqcrypto_traits::kem::{Ciphertext, PublicKey, SecretKey, SharedSecret};
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use std::ptr;
use std::slice;

#[repr(C)]
pub struct CKyberKeyPair {
    pub public_key_ptr: *mut u8,
    pub public_key_len: size_t,
    pub secret_key_ptr: *mut u8,
    pub secret_key_len: size_t,
}

#[repr(C)]
pub struct CKyberEncapsulationResult {
    pub shared_secret_ptr: *mut u8,
    pub shared_secret_len: size_t,
    pub ciphertext_ptr: *mut u8,
    pub ciphertext_len: size_t,
}

static mut LAST_ERROR: Option<CString> = None;

fn set_last_error(error: &str) {
    unsafe {
        if let Some(old_error) = LAST_ERROR.take() {
            drop(old_error);
        }
        if let Ok(c_string) = CString::new(error) {
            LAST_ERROR = Some(c_string);
        }
    }
}

fn validate_buffer_params(ptr: *const u8, len: size_t) -> Result<(), FFIErrorCode> {
    if ptr.is_null() {
        return Err(FFIErrorCode::NullPointer);
    }
    if len == 0 {
        return Err(FFIErrorCode::InvalidInput);
    }
    Ok(())
}

fn safe_slice_from_raw<'a>(ptr: *const u8, len: size_t) -> Result<&'a [u8], FFIErrorCode> {
    validate_buffer_params(ptr, len)?;
    unsafe { Ok(slice::from_raw_parts(ptr, len)) }
}

fn allocate_buffer(size: size_t) -> Result<*mut u8, FFIErrorCode> {
    if size == 0 {
        return Err(FFIErrorCode::InvalidInput);
    }

    unsafe {
        let layout = std::alloc::Layout::from_size_align(size, 1)
            .map_err(|_| FFIErrorCode::AllocationFailed)?;
        let ptr = std::alloc::alloc(layout);
        if ptr.is_null() {
            return Err(FFIErrorCode::AllocationFailed);
        }
        Ok(ptr)
    }
}

#[no_mangle]
pub extern "C" fn kyber_keypair_generate() -> *mut CKyberKeyPair {
    let keypair = match std::panic::catch_unwind(|| {
        let (pk, sk) = mlkem768::keypair();

        let public_key_bytes = pk.as_bytes();
        let secret_key_bytes = sk.as_bytes();

        let public_key_ptr = match allocate_buffer(public_key_bytes.len()) {
            Ok(ptr) => ptr,
            Err(_) => {
                set_last_error("Failed to allocate memory for public key");
                return ptr::null_mut();
            }
        };

        let secret_key_ptr = match allocate_buffer(secret_key_bytes.len()) {
            Ok(ptr) => ptr,
            Err(_) => {
                unsafe {
                    std::alloc::dealloc(
                        public_key_ptr,
                        std::alloc::Layout::from_size_align_unchecked(public_key_bytes.len(), 1),
                    );
                }
                set_last_error("Failed to allocate memory for secret key");
                return ptr::null_mut();
            }
        };

        unsafe {
            ptr::copy_nonoverlapping(
                public_key_bytes.as_ptr(),
                public_key_ptr,
                public_key_bytes.len(),
            );
            ptr::copy_nonoverlapping(
                secret_key_bytes.as_ptr(),
                secret_key_ptr,
                secret_key_bytes.len(),
            );
        }

        let keypair_ptr = match allocate_buffer(std::mem::size_of::<CKyberKeyPair>()) {
            Ok(ptr) => ptr as *mut CKyberKeyPair,
            Err(_) => {
                unsafe {
                    std::alloc::dealloc(
                        public_key_ptr,
                        std::alloc::Layout::from_size_align_unchecked(public_key_bytes.len(), 1),
                    );
                    std::alloc::dealloc(
                        secret_key_ptr,
                        std::alloc::Layout::from_size_align_unchecked(secret_key_bytes.len(), 1),
                    );
                }
                set_last_error("Failed to allocate memory for keypair structure");
                return ptr::null_mut();
            }
        };

        unsafe {
            ptr::write(
                keypair_ptr,
                CKyberKeyPair {
                    public_key_ptr,
                    public_key_len: public_key_bytes.len(),
                    secret_key_ptr,
                    secret_key_len: secret_key_bytes.len(),
                },
            );
        }

        keypair_ptr
    }) {
        Ok(ptr) => ptr,
        Err(_) => {
            set_last_error("Panic occurred during key generation");
            ptr::null_mut()
        }
    };

    keypair
}

#[no_mangle]
pub unsafe extern "C" fn kyber_encapsulate(
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
        return FFIErrorCode::NullPointer as c_int;
    }

    let public_key_slice = match safe_slice_from_raw(public_key_ptr, public_key_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Invalid public key parameters");
            return err as c_int;
        }
    };

    let result = std::panic::catch_unwind(|| {
        let pk = match mlkem768::PublicKey::from_bytes(public_key_slice) {
            Ok(pk) => pk,
            Err(_) => {
                set_last_error("Invalid public key format");
                return FFIErrorCode::InvalidKeyFormat as c_int;
            }
        };

        let (ss, ct) = mlkem768::encapsulate(&pk);

        let shared_secret_bytes = ss.as_bytes();
        let ciphertext_bytes = ct.as_bytes();

        let shared_secret_ptr = match allocate_buffer(shared_secret_bytes.len()) {
            Ok(ptr) => ptr,
            Err(_) => {
                set_last_error("Failed to allocate memory for shared secret");
                return FFIErrorCode::AllocationFailed as c_int;
            }
        };

        let ciphertext_ptr = match allocate_buffer(ciphertext_bytes.len()) {
            Ok(ptr) => ptr,
            Err(_) => {
                unsafe {
                    std::alloc::dealloc(
                        shared_secret_ptr,
                        std::alloc::Layout::from_size_align_unchecked(shared_secret_bytes.len(), 1),
                    );
                }
                set_last_error("Failed to allocate memory for ciphertext");
                return FFIErrorCode::AllocationFailed as c_int;
            }
        };

        unsafe {
            ptr::copy_nonoverlapping(
                shared_secret_bytes.as_ptr(),
                shared_secret_ptr,
                shared_secret_bytes.len(),
            );
            ptr::copy_nonoverlapping(
                ciphertext_bytes.as_ptr(),
                ciphertext_ptr,
                ciphertext_bytes.len(),
            );

            *shared_secret_out = shared_secret_ptr;
            *shared_secret_len_out = shared_secret_bytes.len();
            *ciphertext_out = ciphertext_ptr;
            *ciphertext_len_out = ciphertext_bytes.len();
        }

        FFIErrorCode::Success as c_int
    });

    match result {
        Ok(code) => code,
        Err(_) => {
            set_last_error("Panic occurred during encapsulation");
            FFIErrorCode::CryptoError as c_int
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn kyber_decapsulate(
    secret_key_ptr: *const u8,
    secret_key_len: size_t,
    ciphertext_ptr: *const u8,
    ciphertext_len: size_t,
    shared_secret_out: *mut *mut u8,
    shared_secret_len_out: *mut size_t,
) -> c_int {
    if shared_secret_out.is_null() || shared_secret_len_out.is_null() {
        set_last_error("Output parameters cannot be null");
        return FFIErrorCode::NullPointer as c_int;
    }

    let secret_key_slice = match safe_slice_from_raw(secret_key_ptr, secret_key_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Invalid secret key parameters");
            return err as c_int;
        }
    };

    let ciphertext_slice = match safe_slice_from_raw(ciphertext_ptr, ciphertext_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Invalid ciphertext parameters");
            return err as c_int;
        }
    };

    let result = std::panic::catch_unwind(|| {
        let sk = match mlkem768::SecretKey::from_bytes(secret_key_slice) {
            Ok(sk) => sk,
            Err(_) => {
                set_last_error("Invalid secret key format");
                return FFIErrorCode::InvalidKeyFormat as c_int;
            }
        };

        let ct = match mlkem768::Ciphertext::from_bytes(ciphertext_slice) {
            Ok(ct) => ct,
            Err(_) => {
                set_last_error("Invalid ciphertext format");
                return FFIErrorCode::InvalidKeyFormat as c_int;
            }
        };

        let ss = mlkem768::decapsulate(&ct, &sk);
        let shared_secret_bytes = ss.as_bytes();

        let shared_secret_ptr = match allocate_buffer(shared_secret_bytes.len()) {
            Ok(ptr) => ptr,
            Err(_) => {
                set_last_error("Failed to allocate memory for shared secret");
                return FFIErrorCode::AllocationFailed as c_int;
            }
        };

        unsafe {
            ptr::copy_nonoverlapping(
                shared_secret_bytes.as_ptr(),
                shared_secret_ptr,
                shared_secret_bytes.len(),
            );
            *shared_secret_out = shared_secret_ptr;
            *shared_secret_len_out = shared_secret_bytes.len();
        }

        FFIErrorCode::Success as c_int
    });

    match result {
        Ok(code) => code,
        Err(_) => {
            set_last_error("Panic occurred during decapsulation");
            FFIErrorCode::CryptoError as c_int
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn kyber_keypair_free(keypair: *mut CKyberKeyPair) {
    if keypair.is_null() {
        return;
    }

    unsafe {
        let keypair_ref = &*keypair;

        if !keypair_ref.public_key_ptr.is_null() {
            let layout =
                std::alloc::Layout::from_size_align_unchecked(keypair_ref.public_key_len, 1);

            ptr::write_bytes(keypair_ref.public_key_ptr, 0, keypair_ref.public_key_len);
            std::alloc::dealloc(keypair_ref.public_key_ptr, layout);
        }

        if !keypair_ref.secret_key_ptr.is_null() {
            let layout =
                std::alloc::Layout::from_size_align_unchecked(keypair_ref.secret_key_len, 1);

            ptr::write_bytes(keypair_ref.secret_key_ptr, 0, keypair_ref.secret_key_len);
            std::alloc::dealloc(keypair_ref.secret_key_ptr, layout);
        }

        let keypair_layout =
            std::alloc::Layout::from_size_align_unchecked(std::mem::size_of::<CKyberKeyPair>(), 1);
        ptr::write_bytes(keypair as *mut u8, 0, std::mem::size_of::<CKyberKeyPair>());
        std::alloc::dealloc(keypair as *mut u8, keypair_layout);
    }
}

#[no_mangle]
pub extern "C" fn kyber_buffer_free(ptr: *mut u8, len: size_t) {
    if ptr.is_null() || len == 0 {
        return;
    }

    unsafe {
        let layout = std::alloc::Layout::from_size_align_unchecked(len, 1);
        ptr::write_bytes(ptr, 0, len);
        std::alloc::dealloc(ptr, layout);
    }
}

#[no_mangle]
pub extern "C" fn kyber_get_last_error() -> *const c_char {
    unsafe {
        match LAST_ERROR.as_ref() {
            Some(error) => error.as_ptr(),
            None => ptr::null(),
        }
    }
}

#[no_mangle]
pub extern "C" fn kyber_clear_last_error() {
    unsafe {
        if let Some(error) = LAST_ERROR.take() {
            drop(error);
        }
    }
}
