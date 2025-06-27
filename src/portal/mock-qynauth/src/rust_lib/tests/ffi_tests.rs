#[cfg(test)]
mod ffi_tests {
    use qynauth_pqc::ffi::{mlkem_ffi::*, mldsa_ffi::*, memory::*};
    use std::ptr;
    
    #[test]
    fn test_mlkem_keypair_generation() {
        let keypair_ptr = mlkem_keypair_generate();
        assert!(!keypair_ptr.is_null());
        
        unsafe {
            let keypair = &*keypair_ptr;
            assert!(!keypair.public_key_ptr.is_null());
            assert!(!keypair.secret_key_ptr.is_null());
            assert!(keypair.public_key_len > 0);
            assert!(keypair.secret_key_len > 0);
            
            mlkem_keypair_free(keypair_ptr);
        }
    }
    
    #[test]
    fn test_mlkem_encapsulation_decapsulation() {
        let keypair_ptr = mlkem_keypair_generate();
        assert!(!keypair_ptr.is_null());
        
        unsafe {
            let keypair = &*keypair_ptr;
            
            let mut shared_secret_ptr = ptr::null_mut();
            let mut shared_secret_len = 0;
            let mut ciphertext_ptr = ptr::null_mut();
            let mut ciphertext_len = 0;
            
            let result = mlkem_encapsulate(
                keypair.public_key_ptr,
                keypair.public_key_len,
                &mut shared_secret_ptr,
                &mut shared_secret_len,
                &mut ciphertext_ptr,
                &mut ciphertext_len,
            );
            
            assert_eq!(result, FFIErrorCode::Success as i32);
            assert!(!shared_secret_ptr.is_null());
            assert!(!ciphertext_ptr.is_null());
            assert!(shared_secret_len > 0);
            assert!(ciphertext_len > 0);
            
            let mut decap_shared_secret_ptr = ptr::null_mut();
            let mut decap_shared_secret_len = 0;
            
            let decap_result = mlkem_decapsulate(
                keypair.secret_key_ptr,
                keypair.secret_key_len,
                ciphertext_ptr,
                ciphertext_len,
                &mut decap_shared_secret_ptr,
                &mut decap_shared_secret_len,
            );
            
            assert_eq!(decap_result, FFIErrorCode::Success as i32);
            assert!(!decap_shared_secret_ptr.is_null());
            assert_eq!(shared_secret_len, decap_shared_secret_len);
            
            let original_secret = std::slice::from_raw_parts(shared_secret_ptr, shared_secret_len);
            let decap_secret = std::slice::from_raw_parts(decap_shared_secret_ptr, decap_shared_secret_len);
            assert_eq!(original_secret, decap_secret);
            
            ffi_buffer_free(shared_secret_ptr, shared_secret_len);
            ffi_buffer_free(ciphertext_ptr, ciphertext_len);
            ffi_buffer_free(decap_shared_secret_ptr, decap_shared_secret_len);
            mlkem_keypair_free(keypair_ptr);
        }
    }
    
    #[test]
    fn test_mldsa_keypair_generation() {
        let keypair_ptr = mldsa_keypair_generate();
        assert!(!keypair_ptr.is_null());
        
        unsafe {
            let keypair = &*keypair_ptr;
            assert!(!keypair.public_key_ptr.is_null());
            assert!(!keypair.secret_key_ptr.is_null());
            assert!(keypair.public_key_len > 0);
            assert!(keypair.secret_key_len > 0);
            
            mldsa_keypair_free(keypair_ptr);
        }
    }
    
    #[test]
    fn test_mldsa_sign_verify() {
        let keypair_ptr = mldsa_keypair_generate();
        assert!(!keypair_ptr.is_null());
        
        unsafe {
            let keypair = &*keypair_ptr;
            let message = b"test message for signing";
            
            let mut signature_ptr = ptr::null_mut();
            let mut signature_len = 0;
            
            let sign_result = mldsa_sign(
                keypair.secret_key_ptr,
                keypair.secret_key_len,
                message.as_ptr(),
                message.len(),
                &mut signature_ptr,
                &mut signature_len,
            );
            
            assert_eq!(sign_result, FFIErrorCode::Success as i32);
            assert!(!signature_ptr.is_null());
            assert!(signature_len > 0);
            
            let verify_result = mldsa_verify(
                keypair.public_key_ptr,
                keypair.public_key_len,
                message.as_ptr(),
                message.len(),
                signature_ptr,
                signature_len,
            );
            
            assert_eq!(verify_result, FFIErrorCode::Success as i32);
            
            let invalid_message = b"different message";
            let invalid_verify_result = mldsa_verify(
                keypair.public_key_ptr,
                keypair.public_key_len,
                invalid_message.as_ptr(),
                invalid_message.len(),
                signature_ptr,
                signature_len,
            );
            
            assert_eq!(invalid_verify_result, FFIErrorCode::SignatureVerificationFailed as i32);
            
            ffi_buffer_free(signature_ptr, signature_len);
            mldsa_keypair_free(keypair_ptr);
        }
    }
    
    #[test]
    fn test_memory_safety() {
        let buffer = FFIBuffer::new(1024).unwrap();
        let ptr = buffer.into_raw();
        
        let recovered_buffer = FFIBuffer::from_raw_parts(ptr, 1024);
        recovered_buffer.secure_free();
    }
    
    #[test]
    fn test_error_handling() {
        let result = validate_buffer_params(ptr::null(), 100);
        assert!(result.is_err());
        
        let dummy_ptr = 0x1 as *const u8;
        let result = validate_buffer_params(dummy_ptr, 0);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_null_pointer_handling() {
        let result = mlkem_encapsulate(
            ptr::null(),
            0,
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
        );
        assert_eq!(result, FFIErrorCode::InvalidInput as i32);
        
        let result = mldsa_sign(
            ptr::null(),
            0,
            ptr::null(),
            0,
            ptr::null_mut(),
            ptr::null_mut(),
        );
        assert_eq!(result, FFIErrorCode::InvalidInput as i32);
    }
}
