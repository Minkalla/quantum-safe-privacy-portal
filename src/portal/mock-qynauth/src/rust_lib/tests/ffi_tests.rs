#[cfg(test)]
mod ffi_tests {
    use std::ptr;
    use std::ffi::CStr;
    use libc::size_t;
    
    use qynauth_pqc::ffi::{
        kyber_keypair_generate, kyber_encapsulate, kyber_decapsulate, kyber_keypair_free,
        dilithium_keypair_generate, dilithium_sign, dilithium_verify, dilithium_keypair_free,
        dilithium_buffer_free, memory::FFIErrorCode
    };

    #[test]
    fn test_kyber_keypair_generation() {
        let keypair = kyber_keypair_generate();
        assert!(!keypair.is_null(), "Keypair generation should not return null");
        
        unsafe {
            let keypair_ref = &*keypair;
            assert!(!keypair_ref.public_key_ptr.is_null(), "Public key pointer should not be null");
            assert!(!keypair_ref.secret_key_ptr.is_null(), "Secret key pointer should not be null");
            assert_eq!(keypair_ref.public_key_len, 1184, "ML-KEM-768 public key should be 1184 bytes");
            assert_eq!(keypair_ref.secret_key_len, 2400, "ML-KEM-768 secret key should be 2400 bytes");
            
            kyber_keypair_free(keypair);
        }
    }

    #[test]
    fn test_kyber_encapsulation_decapsulation() {
        let keypair = kyber_keypair_generate();
        assert!(!keypair.is_null(), "Keypair generation should not return null");
        
        unsafe {
            let keypair_ref = &*keypair;
            
            let mut shared_secret_ptr: *mut u8 = ptr::null_mut();
            let mut shared_secret_len: size_t = 0;
            let mut ciphertext_ptr: *mut u8 = ptr::null_mut();
            let mut ciphertext_len: size_t = 0;
            
            let encap_result = kyber_encapsulate(
                keypair_ref.public_key_ptr,
                keypair_ref.public_key_len,
                &mut shared_secret_ptr,
                &mut shared_secret_len,
                &mut ciphertext_ptr,
                &mut ciphertext_len,
            );
            
            assert_eq!(encap_result, FFIErrorCode::Success as i32, "Encapsulation should succeed");
            assert!(!shared_secret_ptr.is_null(), "Shared secret pointer should not be null");
            assert!(!ciphertext_ptr.is_null(), "Ciphertext pointer should not be null");
            assert_eq!(shared_secret_len, 32, "Shared secret should be 32 bytes");
            assert_eq!(ciphertext_len, 1088, "ML-KEM-768 ciphertext should be 1088 bytes");
            
            let mut recovered_secret_ptr: *mut u8 = ptr::null_mut();
            let mut recovered_secret_len: size_t = 0;
            
            let decap_result = kyber_decapsulate(
                keypair_ref.secret_key_ptr,
                keypair_ref.secret_key_len,
                ciphertext_ptr,
                ciphertext_len,
                &mut recovered_secret_ptr,
                &mut recovered_secret_len,
            );
            
            assert_eq!(decap_result, FFIErrorCode::Success as i32, "Decapsulation should succeed");
            assert!(!recovered_secret_ptr.is_null(), "Recovered secret pointer should not be null");
            assert_eq!(recovered_secret_len, 32, "Recovered secret should be 32 bytes");
            
            let original_secret = std::slice::from_raw_parts(shared_secret_ptr, shared_secret_len);
            let recovered_secret = std::slice::from_raw_parts(recovered_secret_ptr, recovered_secret_len);
            assert_eq!(original_secret, recovered_secret, "Shared secrets should match");
            
            qynauth_pqc::ffi::kyber_buffer_free(shared_secret_ptr, shared_secret_len);
            qynauth_pqc::ffi::kyber_buffer_free(ciphertext_ptr, ciphertext_len);
            qynauth_pqc::ffi::kyber_buffer_free(recovered_secret_ptr, recovered_secret_len);
            kyber_keypair_free(keypair);
        }
    }

    #[test]
    fn test_dilithium_keypair_generation() {
        let keypair = dilithium_keypair_generate();
        assert!(!keypair.is_null(), "Keypair generation should not return null");
        
        unsafe {
            let keypair_ref = &*keypair;
            assert!(!keypair_ref.public_key_ptr.is_null(), "Public key pointer should not be null");
            assert!(!keypair_ref.secret_key_ptr.is_null(), "Secret key pointer should not be null");
            assert_eq!(keypair_ref.public_key_len, 1952, "ML-DSA-65 public key should be 1952 bytes");
            assert_eq!(keypair_ref.secret_key_len, 4032, "ML-DSA-65 secret key should be 4032 bytes");
            
            dilithium_keypair_free(keypair);
        }
    }

    #[test]
    fn test_dilithium_signing_verification() {
        let keypair = dilithium_keypair_generate();
        assert!(!keypair.is_null(), "Keypair generation should not return null");
        
        unsafe {
            let keypair_ref = &*keypair;
            let message = b"Hello, Quantum-Safe World!";
            
            let mut signature_ptr: *mut u8 = ptr::null_mut();
            let mut signature_len: size_t = 0;
            
            let sign_result = dilithium_sign(
                keypair_ref.secret_key_ptr,
                keypair_ref.secret_key_len,
                message.as_ptr(),
                message.len(),
                &mut signature_ptr,
                &mut signature_len,
            );
            
            assert_eq!(sign_result, FFIErrorCode::Success as i32, "Signing should succeed");
            assert!(!signature_ptr.is_null(), "Signature pointer should not be null");
            assert!(signature_len > 0, "Signature length should be positive");
            assert!(signature_len <= 4595, "ML-DSA-65 signature should be at most 4595 bytes");
            
            let verify_result = dilithium_verify(
                keypair_ref.public_key_ptr,
                keypair_ref.public_key_len,
                message.as_ptr(),
                message.len(),
                signature_ptr,
                signature_len,
            );
            
            assert_eq!(verify_result, FFIErrorCode::Success as i32, "Verification should succeed");
            
            let wrong_message = b"Different message";
            let verify_wrong_result = dilithium_verify(
                keypair_ref.public_key_ptr,
                keypair_ref.public_key_len,
                wrong_message.as_ptr(),
                wrong_message.len(),
                signature_ptr,
                signature_len,
            );
            
            assert_eq!(verify_wrong_result, FFIErrorCode::SignatureVerificationFailed as i32, 
                      "Verification with wrong message should fail");
            
            dilithium_buffer_free(signature_ptr, signature_len);
            dilithium_keypair_free(keypair);
        }
    }

    #[test]
    fn test_memory_safety() {
        let keypair = kyber_keypair_generate();
        assert!(!keypair.is_null(), "Keypair generation should not return null");
        
        unsafe {
            let keypair_ref = &*keypair;
            
            let mut shared_secret_ptr: *mut u8 = ptr::null_mut();
            let mut shared_secret_len: size_t = 0;
            let mut ciphertext_ptr: *mut u8 = ptr::null_mut();
            let mut ciphertext_len: size_t = 0;
            
            let encap_result = kyber_encapsulate(
                keypair_ref.public_key_ptr,
                keypair_ref.public_key_len,
                &mut shared_secret_ptr,
                &mut shared_secret_len,
                &mut ciphertext_ptr,
                &mut ciphertext_len,
            );
            
            assert_eq!(encap_result, FFIErrorCode::Success as i32, "Encapsulation should succeed");
            
            qynauth_pqc::ffi::kyber_buffer_free(shared_secret_ptr, shared_secret_len);
            qynauth_pqc::ffi::kyber_buffer_free(ciphertext_ptr, ciphertext_len);
            kyber_keypair_free(keypair);
        }
        
        let dilithium_keypair = dilithium_keypair_generate();
        assert!(!dilithium_keypair.is_null(), "Dilithium keypair generation should not return null");
        
        unsafe {
            dilithium_keypair_free(dilithium_keypair);
        }
    }

    #[test]
    fn test_null_pointer_handling() {
        unsafe {
            let mut shared_secret_ptr: *mut u8 = ptr::null_mut();
            let mut shared_secret_len: size_t = 0;
            let mut ciphertext_ptr: *mut u8 = ptr::null_mut();
            let mut ciphertext_len: size_t = 0;
            
            let encap_result = kyber_encapsulate(
                ptr::null(),
                0,
                &mut shared_secret_ptr,
                &mut shared_secret_len,
                &mut ciphertext_ptr,
                &mut ciphertext_len,
            );
            
            assert_eq!(encap_result, FFIErrorCode::NullPointer as i32, 
                      "Encapsulation with null pointer should fail");
            
            let mut signature_ptr: *mut u8 = ptr::null_mut();
            let mut signature_len: size_t = 0;
            
            let sign_result = dilithium_sign(
                ptr::null(),
                0,
                ptr::null(),
                0,
                &mut signature_ptr,
                &mut signature_len,
            );
            
            assert_eq!(sign_result, FFIErrorCode::NullPointer as i32, 
                      "Signing with null pointer should fail");
        }
    }

    #[test]
    fn test_invalid_key_format() {
        unsafe {
            let invalid_key = [0u8; 100];
            let message = b"Test message";
            
            let mut signature_ptr: *mut u8 = ptr::null_mut();
            let mut signature_len: size_t = 0;
            
            let sign_result = dilithium_sign(
                invalid_key.as_ptr(),
                invalid_key.len(),
                message.as_ptr(),
                message.len(),
                &mut signature_ptr,
                &mut signature_len,
            );
            
            assert_eq!(sign_result, FFIErrorCode::InvalidKeyFormat as i32, 
                      "Signing with invalid key format should fail");
        }
    }

    #[test]
    fn test_error_message_retrieval() {
        unsafe {
            let mut shared_secret_ptr: *mut u8 = ptr::null_mut();
            let mut shared_secret_len: size_t = 0;
            let mut ciphertext_ptr: *mut u8 = ptr::null_mut();
            let mut ciphertext_len: size_t = 0;
            
            kyber_encapsulate(
                ptr::null(),
                0,
                &mut shared_secret_ptr,
                &mut shared_secret_len,
                &mut ciphertext_ptr,
                &mut ciphertext_len,
            );
            
            let error_ptr = qynauth_pqc::ffi::kyber_get_last_error();
            assert!(!error_ptr.is_null(), "Error message should be available");
            
            let error_cstr = CStr::from_ptr(error_ptr);
            let error_str = error_cstr.to_str().expect("Error message should be valid UTF-8");
            assert!(!error_str.is_empty(), "Error message should not be empty");
        }
    }
}
