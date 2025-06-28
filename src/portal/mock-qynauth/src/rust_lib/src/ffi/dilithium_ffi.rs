use libc::size_t;
use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use std::ptr;

use pqcrypto_mldsa::mldsa65::{keypair, open, sign, PublicKey, SecretKey, SignedMessage};
use pqcrypto_traits::sign::{
    PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage as SignedMessageTrait,
};

use crate::ffi::memory::{
    safe_slice_from_raw, secure_allocate, secure_deallocate, validate_buffer_params, FFIErrorCode,
};

static mut LAST_ERROR: Option<CString> = None;

#[repr(C)]
pub struct CDilithiumKeyPair {
    pub public_key_ptr: *mut u8,
    pub public_key_len: size_t,
    pub secret_key_ptr: *mut u8,
    pub secret_key_len: size_t,
}

#[repr(C)]
pub struct CDilithiumSignature {
    pub signature_ptr: *mut u8,
    pub signature_len: size_t,
}

fn set_last_error(error: &str) {
    unsafe {
        LAST_ERROR = CString::new(error).ok();
    }
}

#[no_mangle]
pub extern "C" fn dilithium_get_last_error() -> *const c_char {
    unsafe {
        match LAST_ERROR.as_ref() {
            Some(err) => err.as_ptr(),
            None => ptr::null(),
        }
    }
}

#[no_mangle]
pub extern "C" fn dilithium_keypair_generate() -> *mut CDilithiumKeyPair {
    let (public_key, secret_key) = keypair();

    let public_key_bytes = public_key.as_bytes();
    let secret_key_bytes = secret_key.as_bytes();

    let public_key_ptr = match secure_allocate(public_key_bytes.len()) {
        Ok(ptr) => ptr,
        Err(_) => {
            set_last_error("Failed to allocate memory for public key");
            return ptr::null_mut();
        }
    };

    let secret_key_ptr = match secure_allocate(secret_key_bytes.len()) {
        Ok(ptr) => ptr,
        Err(_) => {
            secure_deallocate(public_key_ptr, public_key_bytes.len());
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

    let keypair_ptr = match secure_allocate(std::mem::size_of::<CDilithiumKeyPair>()) {
        Ok(ptr) => ptr as *mut CDilithiumKeyPair,
        Err(_) => {
            secure_deallocate(public_key_ptr, public_key_bytes.len());
            secure_deallocate(secret_key_ptr, secret_key_bytes.len());
            set_last_error("Failed to allocate memory for keypair structure");
            return ptr::null_mut();
        }
    };

    unsafe {
        (*keypair_ptr).public_key_ptr = public_key_ptr;
        (*keypair_ptr).public_key_len = public_key_bytes.len();
        (*keypair_ptr).secret_key_ptr = secret_key_ptr;
        (*keypair_ptr).secret_key_len = secret_key_bytes.len();
    }

    keypair_ptr
}

#[no_mangle]
pub unsafe extern "C" fn dilithium_sign(
    secret_key_ptr: *const u8,
    secret_key_len: size_t,
    message_ptr: *const u8,
    message_len: size_t,
    signature_out: *mut *mut u8,
    signature_len_out: *mut size_t,
) -> c_int {
    if signature_out.is_null() || signature_len_out.is_null() {
        set_last_error("Output pointers cannot be null");
        return FFIErrorCode::NullPointer as c_int;
    }

    if let Err(err) = validate_buffer_params(secret_key_ptr, secret_key_len) {
        set_last_error("Invalid secret key parameters");
        return err as c_int;
    }

    if let Err(err) = validate_buffer_params(message_ptr, message_len) {
        set_last_error("Invalid message parameters");
        return err as c_int;
    }

    let secret_key_slice = match safe_slice_from_raw(secret_key_ptr, secret_key_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Failed to create secret key slice");
            return err as c_int;
        }
    };

    let message_slice = match safe_slice_from_raw(message_ptr, message_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Failed to create message slice");
            return err as c_int;
        }
    };

    let secret_key = match SecretKey::from_bytes(secret_key_slice) {
        Ok(key) => key,
        Err(_) => {
            set_last_error("Invalid secret key format");
            return FFIErrorCode::InvalidKeyFormat as c_int;
        }
    };

    let signed_message = sign(message_slice, &secret_key);
    let signature_bytes = signed_message.as_bytes();

    let signature_ptr = match secure_allocate(signature_bytes.len()) {
        Ok(ptr) => ptr,
        Err(_) => {
            set_last_error("Failed to allocate memory for signature");
            return FFIErrorCode::AllocationFailed as c_int;
        }
    };

    unsafe {
        ptr::copy_nonoverlapping(
            signature_bytes.as_ptr(),
            signature_ptr,
            signature_bytes.len(),
        );
        *signature_out = signature_ptr;
        *signature_len_out = signature_bytes.len();
    }

    FFIErrorCode::Success as c_int
}

#[no_mangle]
pub extern "C" fn dilithium_verify(
    public_key_ptr: *const u8,
    public_key_len: size_t,
    message_ptr: *const u8,
    message_len: size_t,
    signature_ptr: *const u8,
    signature_len: size_t,
) -> c_int {
    if let Err(err) = validate_buffer_params(public_key_ptr, public_key_len) {
        set_last_error("Invalid public key parameters");
        return err as c_int;
    }

    if let Err(err) = validate_buffer_params(message_ptr, message_len) {
        set_last_error("Invalid message parameters");
        return err as c_int;
    }

    if let Err(err) = validate_buffer_params(signature_ptr, signature_len) {
        set_last_error("Invalid signature parameters");
        return err as c_int;
    }

    let public_key_slice = match safe_slice_from_raw(public_key_ptr, public_key_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Failed to create public key slice");
            return err as c_int;
        }
    };

    let message_slice = match safe_slice_from_raw(message_ptr, message_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Failed to create message slice");
            return err as c_int;
        }
    };

    let signature_slice = match safe_slice_from_raw(signature_ptr, signature_len) {
        Ok(slice) => slice,
        Err(err) => {
            set_last_error("Failed to create signature slice");
            return err as c_int;
        }
    };

    let public_key = match PublicKey::from_bytes(public_key_slice) {
        Ok(key) => key,
        Err(_) => {
            set_last_error("Invalid public key format");
            return FFIErrorCode::InvalidKeyFormat as c_int;
        }
    };

    let signed_message = match SignedMessage::from_bytes(signature_slice) {
        Ok(msg) => msg,
        Err(_) => {
            set_last_error("Invalid signature format");
            return FFIErrorCode::InvalidKeyFormat as c_int;
        }
    };

    match open(&signed_message, &public_key) {
        Ok(verified_message) => {
            if verified_message == message_slice {
                FFIErrorCode::Success as c_int
            } else {
                set_last_error("Message verification failed - content mismatch");
                FFIErrorCode::SignatureVerificationFailed as c_int
            }
        }
        Err(_) => {
            set_last_error("Signature verification failed");
            FFIErrorCode::SignatureVerificationFailed as c_int
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn dilithium_keypair_free(keypair: *mut CDilithiumKeyPair) {
    if keypair.is_null() {
        return;
    }

    unsafe {
        let keypair_ref = &*keypair;

        if !keypair_ref.public_key_ptr.is_null() {
            secure_deallocate(keypair_ref.public_key_ptr, keypair_ref.public_key_len);
        }

        if !keypair_ref.secret_key_ptr.is_null() {
            secure_deallocate(keypair_ref.secret_key_ptr, keypair_ref.secret_key_len);
        }

        secure_deallocate(keypair as *mut u8, std::mem::size_of::<CDilithiumKeyPair>());
    }
}

#[no_mangle]
pub unsafe extern "C" fn dilithium_signature_free(signature: *mut CDilithiumSignature) {
    if signature.is_null() {
        return;
    }

    unsafe {
        let signature_ref = &*signature;

        if !signature_ref.signature_ptr.is_null() {
            secure_deallocate(signature_ref.signature_ptr, signature_ref.signature_len);
        }

        secure_deallocate(
            signature as *mut u8,
            std::mem::size_of::<CDilithiumSignature>(),
        );
    }
}

#[no_mangle]
pub extern "C" fn dilithium_buffer_free(ptr: *mut u8, len: size_t) {
    if !ptr.is_null() && len > 0 {
        secure_deallocate(ptr, len);
    }
}
