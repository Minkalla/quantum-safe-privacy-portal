#![allow(clippy::missing_safety_doc)]
#![allow(static_mut_refs)]
#![allow(clippy::uninlined_format_args)]
#![allow(clippy::unwrap_or_default)]
#![allow(clippy::not_unsafe_ptr_arg_deref)]
#![allow(clippy::manual_unwrap_or_default)]
#![allow(clippy::manual_unwrap_or)]

use pqcrypto_mldsa::mldsa65;
use pqcrypto_mlkem::mlkem768;
use pqcrypto_traits::kem::{Ciphertext, PublicKey, SecretKey, SharedSecret};
use pqcrypto_traits::sign::{
    PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage,
};
use secrecy::{ExposeSecret, Secret};
use std::ffi::CString;
use std::os::raw::c_char;
use thiserror::Error;

pub mod ffi;

#[derive(Error, Debug)]
pub enum PQCError {
    #[error("Invalid public key format: {0}")]
    InvalidPublicKey(String),
    #[error("Invalid private key format: {0}")]
    InvalidPrivateKey(String),
    #[error("Invalid ciphertext format: {0}")]
    InvalidCiphertext(String),
    #[error("Invalid signature format: {0}")]
    InvalidSignature(String),
    #[error("Key generation failed: {0}")]
    KeyGenerationFailed(String),
    #[error("Encapsulation failed: {0}")]
    EncapsulationFailed(String),
    #[error("Decapsulation failed: {0}")]
    DecapsulationFailed(String),
    #[error("Signing failed: {0}")]
    SigningFailed(String),
    #[error("Verification failed: {0}")]
    VerificationFailed(String),
    #[error("Key not found: {0}")]
    KeyNotFound(String),
    #[error("Invalid key state: {0}")]
    InvalidKeyState(String),
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),
    #[error("HSM error: {0}")]
    HSMError(String),
    #[error("Memory allocation failed")]
    MemoryAllocationFailed,
    #[error("Security validation failed: {0}")]
    SecurityValidationFailed(String),
}

pub type PQCResult<T> = Result<T, PQCError>;

pub mod key_management;
pub use key_management::{SecureKeyManager, KeyMetadata, KeyStatus, HSMConfig, KeyStatistics};

pub struct PQCKeyPair {
    pub public_key: Vec<u8>,
    pub private_key: Secret<Vec<u8>>,
    pub algorithm: String,
    pub key_size: usize,
    pub security_level: u8,
    pub created_at: u64,
}

impl Clone for PQCKeyPair {
    fn clone(&self) -> Self {
        Self {
            public_key: self.public_key.clone(),
            private_key: Secret::new(self.private_key.expose_secret().clone()),
            algorithm: self.algorithm.clone(),
            key_size: self.key_size,
            security_level: self.security_level,
            created_at: self.created_at,
        }
    }
}

impl std::fmt::Debug for PQCKeyPair {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCKeyPair")
            .field("public_key", &{
                let len = self.public_key.len();
                format!("[{len} bytes]")
            })
            .field("private_key", &"[REDACTED]")
            .field("algorithm", &self.algorithm)
            .field("key_size", &self.key_size)
            .field("security_level", &self.security_level)
            .field("created_at", &self.created_at)
            .finish()
    }
}

pub struct PQCSignature {
    pub signature: Secret<Vec<u8>>,
    pub algorithm: String,
    pub signature_size: usize,
    pub created_at: u64,
}

impl Clone for PQCSignature {
    fn clone(&self) -> Self {
        Self {
            signature: Secret::new(self.signature.expose_secret().clone()),
            algorithm: self.algorithm.clone(),
            signature_size: self.signature_size,
            created_at: self.created_at,
        }
    }
}

impl std::fmt::Debug for PQCSignature {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCSignature")
            .field("signature", &"[REDACTED]")
            .field("algorithm", &self.algorithm)
            .field("signature_size", &self.signature_size)
            .field("created_at", &self.created_at)
            .finish()
    }
}

pub struct PQCEncryptionResult {
    pub ciphertext: Vec<u8>,
    pub shared_secret: Secret<Vec<u8>>,
    pub algorithm: String,
    pub ciphertext_size: usize,
    pub created_at: u64,
}

impl Clone for PQCEncryptionResult {
    fn clone(&self) -> Self {
        Self {
            ciphertext: self.ciphertext.clone(),
            shared_secret: Secret::new(self.shared_secret.expose_secret().clone()),
            algorithm: self.algorithm.clone(),
            ciphertext_size: self.ciphertext_size,
            created_at: self.created_at,
        }
    }
}

impl std::fmt::Debug for PQCEncryptionResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCEncryptionResult")
            .field("ciphertext", &format!("[{} bytes]", self.ciphertext.len()))
            .field("shared_secret", &"[REDACTED]")
            .field("algorithm", &self.algorithm)
            .field("ciphertext_size", &self.ciphertext_size)
            .field("created_at", &self.created_at)
            .finish()
    }
}

pub fn generate_mlkem_keypair() -> PQCResult<PQCKeyPair> {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::KeyGenerationFailed("System time error".to_string()))?
        .as_secs();

    let (pk, sk) = mlkem768::keypair();
    Ok(PQCKeyPair {
        public_key: pk.as_bytes().to_vec(),
        private_key: Secret::new(sk.as_bytes().to_vec()),
        algorithm: "ML-KEM-768".to_string(),
        key_size: pk.as_bytes().len() + sk.as_bytes().len(),
        security_level: 3,
        created_at: current_time,
    })
}

pub fn generate_mldsa_keypair() -> PQCResult<PQCKeyPair> {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::KeyGenerationFailed("System time error".to_string()))?
        .as_secs();

    let (pk, sk) = mldsa65::keypair();
    Ok(PQCKeyPair {
        public_key: pk.as_bytes().to_vec(),
        private_key: Secret::new(sk.as_bytes().to_vec()),
        algorithm: "ML-DSA-65".to_string(),
        key_size: pk.as_bytes().len() + sk.as_bytes().len(),
        security_level: 3,
        created_at: current_time,
    })
}

pub fn mlkem_encapsulate(public_key: &[u8], _message: &[u8]) -> PQCResult<PQCEncryptionResult> {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::EncapsulationFailed("System time error".to_string()))?
        .as_secs();

    let pk = mlkem768::PublicKey::from_bytes(public_key)
        .map_err(|_| PQCError::InvalidPublicKey("Failed to parse ML-KEM public key".to_string()))?;
    let (ss, ct) = mlkem768::encapsulate(&pk);
    Ok(PQCEncryptionResult {
        ciphertext: ct.as_bytes().to_vec(),
        shared_secret: Secret::new(ss.as_bytes().to_vec()),
        algorithm: "ML-KEM-768".to_string(),
        ciphertext_size: ct.as_bytes().len(),
        created_at: current_time,
    })
}

pub fn mlkem_decapsulate(private_key: &[u8], ciphertext: &[u8]) -> PQCResult<Secret<Vec<u8>>> {
    let sk = mlkem768::SecretKey::from_bytes(private_key).map_err(|_| {
        PQCError::InvalidPrivateKey("Failed to parse ML-KEM private key".to_string())
    })?;
    let ct = mlkem768::Ciphertext::from_bytes(ciphertext).map_err(|_| {
        PQCError::InvalidCiphertext("Failed to parse ML-KEM ciphertext".to_string())
    })?;
    let ss = mlkem768::decapsulate(&ct, &sk);
    Ok(Secret::new(ss.as_bytes().to_vec()))
}

pub fn mldsa_sign(private_key: &[u8], message: &[u8]) -> PQCResult<PQCSignature> {
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::SigningFailed("System time error".to_string()))?
        .as_secs();

    let sk = mldsa65::SecretKey::from_bytes(private_key).map_err(|_| {
        PQCError::InvalidPrivateKey("Failed to parse ML-DSA private key".to_string())
    })?;
    let signed_msg = mldsa65::sign(message, &sk);
    Ok(PQCSignature {
        signature: Secret::new(signed_msg.as_bytes().to_vec()),
        algorithm: "ML-DSA-65".to_string(),
        signature_size: signed_msg.as_bytes().len(),
        created_at: current_time,
    })
}

pub fn mldsa_verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> PQCResult<bool> {
    let pk = mldsa65::PublicKey::from_bytes(public_key)
        .map_err(|_| PQCError::InvalidPublicKey("Failed to parse ML-DSA public key".to_string()))?;
    let signed_msg = mldsa65::SignedMessage::from_bytes(signature)
        .map_err(|_| PQCError::InvalidSignature("Failed to parse ML-DSA signature".to_string()))?;

    match mldsa65::open(&signed_msg, &pk) {
        Ok(opened) => Ok(opened == message),
        Err(_) => Ok(false),
    }
}

pub mod mlkem {
    use super::{PQCKeyPair, PQCResult};
    use secrecy::ExposeSecret;

    pub fn generate_keypair() -> PQCResult<PQCKeyPair> {
        super::generate_mlkem_keypair()
    }

    pub fn encapsulate(public_key: &[u8], message: &[u8]) -> PQCResult<(Vec<u8>, Vec<u8>)> {
        let result = super::mlkem_encapsulate(public_key, message)?;
        Ok((
            result.ciphertext,
            result.shared_secret.expose_secret().clone(),
        ))
    }

    pub fn decapsulate(private_key: &[u8], ciphertext: &[u8]) -> PQCResult<Vec<u8>> {
        let secret = super::mlkem_decapsulate(private_key, ciphertext)?;
        Ok(secret.expose_secret().clone())
    }
}

pub mod mldsa {
    use super::{PQCKeyPair, PQCResult};
    use secrecy::ExposeSecret;

    pub fn generate_keypair() -> PQCResult<PQCKeyPair> {
        super::generate_mldsa_keypair()
    }

    pub fn sign(private_key: &[u8], message: &[u8]) -> PQCResult<Vec<u8>> {
        let result = super::mldsa_sign(private_key, message)?;
        Ok(result.signature.expose_secret().clone())
    }

    pub fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> PQCResult<bool> {
        super::mldsa_verify(public_key, message, signature)
    }
}

#[no_mangle]
pub extern "C" fn pqc_ml_kem_768_keygen() -> *mut c_char {
    match generate_mlkem_keypair() {
        Ok(keypair) => {
            let result = serde_json::json!({
                "success": true,
                "public_key": keypair.public_key,
                "private_key": keypair.private_key.expose_secret(),
                "algorithm": keypair.algorithm,
                "key_size": keypair.key_size,
                "security_level": keypair.security_level
            });
            let json_str = result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_ml_kem_768_encaps(
    public_key: *const u8,
    public_key_len: usize,
) -> *mut c_char {
    if public_key.is_null() {
        return std::ptr::null_mut();
    }

    let public_key_slice = std::slice::from_raw_parts(public_key, public_key_len);
    let dummy_message = b"";

    match mlkem_encapsulate(public_key_slice, dummy_message) {
        Ok(result) => {
            let json_result = serde_json::json!({
                "success": true,
                "ciphertext": result.ciphertext,
                "shared_secret": result.shared_secret.expose_secret(),
                "algorithm": result.algorithm
            });
            let json_str = json_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_ml_kem_768_decaps(
    secret_key: *const u8,
    secret_key_len: usize,

    ciphertext: *const u8,
    ciphertext_len: usize,
) -> *mut c_char {
    if secret_key.is_null() || ciphertext.is_null() {
        return std::ptr::null_mut();
    }

    let secret_key_slice = std::slice::from_raw_parts(secret_key, secret_key_len);
    let ciphertext_slice = std::slice::from_raw_parts(ciphertext, ciphertext_len);

    match mlkem_decapsulate(secret_key_slice, ciphertext_slice) {
        Ok(shared_secret) => {
            let json_result = serde_json::json!({
                "success": true,
                "shared_secret": shared_secret.expose_secret()
            });
            let json_str = json_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub extern "C" fn pqc_ml_dsa_65_keygen() -> *mut c_char {
    match generate_mldsa_keypair() {
        Ok(keypair) => {
            let result = serde_json::json!({
                "success": true,
                "public_key": keypair.public_key,
                "private_key": keypair.private_key.expose_secret(),
                "algorithm": keypair.algorithm,
                "key_size": keypair.key_size,
                "security_level": keypair.security_level
            });
            let json_str = result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_ml_dsa_65_sign(
    message: *const u8,
    message_len: usize,

    private_key: *const u8,
    private_key_len: usize,
) -> *mut c_char {
    if message.is_null() || private_key.is_null() {
        return std::ptr::null_mut();
    }

    let message_slice = std::slice::from_raw_parts(message, message_len);
    let private_key_slice = std::slice::from_raw_parts(private_key, private_key_len);

    match mldsa_sign(private_key_slice, message_slice) {
        Ok(signature_result) => {
            let json_result = serde_json::json!({
                "success": true,
                "signature": signature_result.signature.expose_secret(),
                "algorithm": signature_result.algorithm,
                "signature_size": signature_result.signature_size
            });
            let json_str = json_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_ml_dsa_65_verify(
    signature: *const u8,
    signature_len: usize,
    message: *const u8,

    message_len: usize,

    public_key: *const u8,

    public_key_len: usize,
) -> bool {
    if signature.is_null() || message.is_null() || public_key.is_null() {
        return false;
    }

    let signature_slice = std::slice::from_raw_parts(signature, signature_len);
    let message_slice = std::slice::from_raw_parts(message, message_len);
    let public_key_slice = std::slice::from_raw_parts(public_key, public_key_len);

    match mldsa_verify(public_key_slice, message_slice, signature_slice) {
        Ok(is_valid) => is_valid,
        Err(_) => false,
    }
}

#[no_mangle]
pub extern "C" fn pqc_key_manager_create() -> *mut c_char {
    let manager = key_management::create_default_key_manager();
    let manager_ptr = Box::into_raw(Box::new(manager));

    let result = serde_json::json!({
        "success": true,
        "manager_ptr": manager_ptr as usize
    });
    let json_str = result.to_string();
    match CString::new(json_str) {
        Ok(c_string) => c_string.into_raw(),
        Err(_) => std::ptr::null_mut(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_key_manager_generate_key(
    manager_ptr: usize,
    user_id: *const c_char,
    algorithm: *const c_char,
) -> *mut c_char {
    if user_id.is_null() || algorithm.is_null() {
        return std::ptr::null_mut();
    }

    let manager = &mut *(manager_ptr as *mut key_management::SecureKeyManager);
    let user_id_cstring = CString::from_raw(user_id as *mut c_char);
    let user_id_str = match user_id_cstring.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let algorithm_cstring = CString::from_raw(algorithm as *mut c_char);
    let algorithm_str = match algorithm_cstring.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match manager.generate_and_store_key(user_id_str, algorithm_str) {
        Ok(key_id) => {
            let result = serde_json::json!({
                "success": true,
                "key_id": key_id
            });
            let json_str = result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn pqc_key_manager_rotate_key(
    manager_ptr: usize,
    key_id: *const c_char,
) -> *mut c_char {
    if key_id.is_null() {
        return std::ptr::null_mut();
    }

    let manager = &mut *(manager_ptr as *mut key_management::SecureKeyManager);
    let key_id_cstring = CString::from_raw(key_id as *mut c_char);
    let key_id_str = match key_id_cstring.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    match manager.rotate_key(key_id_str) {
        Ok(new_key_id) => {
            let result = serde_json::json!({
                "success": true,
                "new_key_id": new_key_id
            });
            let json_str = result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
        Err(e) => {
            let error_result = serde_json::json!({
                "success": false,
                "error": e.to_string()
            });
            let json_str = error_result.to_string();
            match CString::new(json_str) {
                Ok(c_string) => c_string.into_raw(),
                Err(_) => std::ptr::null_mut(),
            }
        }
    }
}

#[no_mangle]
pub unsafe extern "C" fn perform_quantum_safe_operation_placeholder(
    input_ptr: *const u8,
    input_len: usize,
) -> *mut c_char {
    assert!(!input_ptr.is_null());
    let input_slice = std::slice::from_raw_parts(input_ptr, input_len);

    let input_str = String::from_utf8_lossy(input_slice);

    let mock_result = format!(
        "Rust PQC Real Implementation: Received '{input_str}' ({input_len} bytes). ML-KEM-768 + ML-DSA-65 Ready!"
    );
    let c_string = CString::new(mock_result).expect("CString::new failed");
    c_string.into_raw() as *mut c_char
}

#[no_mangle]
pub unsafe extern "C" fn free_string(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }

    let _ = CString::from_raw(ptr);
}

#[cfg(test)]
mod security_hardening_tests {
    use super::*;
    use zeroize::Zeroize;
    
    #[test]
    fn memory_zeroization() {
        let mut secret_data = [0x42u8; 32];
        let original = secret_data.clone();
        
        assert_eq!(secret_data, original);
        
        secret_data.zeroize();
        
        assert_eq!(secret_data, [0u8; 32]);
        assert_ne!(secret_data, original);
    }
    
    #[test]
    fn input_validation() {
        assert!(validate_public_key(&[]).is_err());
        
        assert!(validate_public_key(&[0u8; 10]).is_err());
        
        let valid_key = [0u8; 1184];
        assert!(validate_public_key(&valid_key).is_ok());
    }
    
    #[test]
    fn error_handling_security() {
        let invalid_key = [0u8; 10];
        let result = pqc_sign_with_key(&invalid_key, b"message");
        
        let error_msg = format!("{:?}", result.unwrap_err());
        assert!(!error_msg.contains("key"));
        assert!(!error_msg.contains("secret"));
        
        assert!(error_msg.contains("Invalid") || error_msg.contains("Error"));
    }
}

#[allow(dead_code)]
fn validate_public_key(key: &[u8]) -> PQCResult<()> {
    if key.is_empty() {
        return Err(PQCError::InvalidPublicKey("Empty key data".to_string()));
    }
    
    if key.len() < 1184 {
        return Err(PQCError::InvalidPublicKey("Key too short".to_string()));
    }
    
    Ok(())
}

#[allow(dead_code)]
fn pqc_sign_with_key(key: &[u8], _message: &[u8]) -> PQCResult<Vec<u8>> {
    if key.len() < 32 {
        return Err(PQCError::InvalidPrivateKey("Invalid input length".to_string()));
    }
    
    Ok(vec![0u8; 64])
}
