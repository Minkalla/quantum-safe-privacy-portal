use std::ffi::CString;
use std::os::raw::c_char;
use serde::{Deserialize, Serialize};
use pqcrypto_mldsa::mldsa65;
use pqcrypto_traits::sign::{PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage};
use thiserror::Error;
use secrecy::{Secret, ExposeSecret};
use log::{error, debug};

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
    #[error("Memory allocation failed")]
    MemoryAllocationFailed,
    #[error("Security validation failed: {0}")]
    SecurityValidationFailed(String),
}

pub type PQCResult<T> = Result<T, PQCError>;

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
            .field("public_key", &format!("Vec<u8> len={}", self.public_key.len()))
            .field("private_key", &"[REDACTED]")
            .field("algorithm", &self.algorithm)
            .field("key_size", &self.key_size)
            .field("security_level", &self.security_level)
            .field("created_at", &self.created_at)
            .finish()
    }
}

impl Serialize for PQCKeyPair {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("PQCKeyPair", 5)?;
        state.serialize_field("public_key", &self.public_key)?;
        state.serialize_field("algorithm", &self.algorithm)?;
        state.serialize_field("key_size", &self.key_size)?;
        state.serialize_field("security_level", &self.security_level)?;
        state.serialize_field("created_at", &self.created_at)?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for PQCKeyPair {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{self, MapAccess, Visitor};
        use std::fmt;

        struct PQCKeyPairVisitor;

        impl<'de> Visitor<'de> for PQCKeyPairVisitor {
            type Value = PQCKeyPair;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct PQCKeyPair")
            }

            fn visit_map<V>(self, mut map: V) -> Result<PQCKeyPair, V::Error>
            where
                V: MapAccess<'de>,
            {
                let mut public_key = None;
                let mut algorithm = None;
                let mut key_size = None;
                let mut security_level = None;
                let mut created_at = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        "public_key" => {
                            if public_key.is_some() {
                                return Err(de::Error::duplicate_field("public_key"));
                            }
                            public_key = Some(map.next_value()?);
                        }
                        "algorithm" => {
                            if algorithm.is_some() {
                                return Err(de::Error::duplicate_field("algorithm"));
                            }
                            algorithm = Some(map.next_value()?);
                        }
                        "key_size" => {
                            if key_size.is_some() {
                                return Err(de::Error::duplicate_field("key_size"));
                            }
                            key_size = Some(map.next_value()?);
                        }
                        "security_level" => {
                            if security_level.is_some() {
                                return Err(de::Error::duplicate_field("security_level"));
                            }
                            security_level = Some(map.next_value()?);
                        }
                        "created_at" => {
                            if created_at.is_some() {
                                return Err(de::Error::duplicate_field("created_at"));
                            }
                            created_at = Some(map.next_value()?);
                        }
                        _ => {
                            let _ = map.next_value::<de::IgnoredAny>()?;
                        }
                    }
                }

                let public_key = public_key.ok_or_else(|| de::Error::missing_field("public_key"))?;
                let algorithm = algorithm.ok_or_else(|| de::Error::missing_field("algorithm"))?;
                let key_size = key_size.ok_or_else(|| de::Error::missing_field("key_size"))?;
                let security_level = security_level.ok_or_else(|| de::Error::missing_field("security_level"))?;
                let created_at = created_at.ok_or_else(|| de::Error::missing_field("created_at"))?;

                Ok(PQCKeyPair {
                    public_key,
                    private_key: Secret::new(vec![]),
                    algorithm,
                    key_size,
                    security_level,
                    created_at,
                })
            }
        }

        deserializer.deserialize_struct("PQCKeyPair", &["public_key", "algorithm", "key_size", "security_level", "created_at"], PQCKeyPairVisitor)
    }
}

impl Drop for PQCKeyPair {
    fn drop(&mut self) {
        debug!("Securely dropping PQC keypair for algorithm: {}", self.algorithm);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PQCSignature {
    pub signature: Vec<u8>,
    pub algorithm: String,
    pub signature_size: usize,
    pub created_at: u64,
}

pub struct PQCEncryptionResult {
    pub ciphertext: Vec<u8>,
    pub shared_secret: Secret<Vec<u8>>,
    pub algorithm: String,
    pub ciphertext_size: usize,
    pub shared_secret_size: usize,
    pub created_at: u64,
}

impl std::fmt::Debug for PQCEncryptionResult {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PQCEncryptionResult")
            .field("ciphertext", &format!("Vec<u8> len={}", self.ciphertext.len()))
            .field("shared_secret", &"[REDACTED]")
            .field("algorithm", &self.algorithm)
            .field("ciphertext_size", &self.ciphertext_size)
            .field("shared_secret_size", &self.shared_secret_size)
            .field("created_at", &self.created_at)
            .finish()
    }
}

impl Serialize for PQCEncryptionResult {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("PQCEncryptionResult", 5)?;
        state.serialize_field("ciphertext", &self.ciphertext)?;
        state.serialize_field("algorithm", &self.algorithm)?;
        state.serialize_field("ciphertext_size", &self.ciphertext_size)?;
        state.serialize_field("shared_secret_size", &self.shared_secret_size)?;
        state.serialize_field("created_at", &self.created_at)?;
        state.end()
    }
}

impl<'de> Deserialize<'de> for PQCEncryptionResult {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{self, MapAccess, Visitor};
        use std::fmt;

        struct PQCEncryptionResultVisitor;

        impl<'de> Visitor<'de> for PQCEncryptionResultVisitor {
            type Value = PQCEncryptionResult;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("struct PQCEncryptionResult")
            }

            fn visit_map<V>(self, mut map: V) -> Result<PQCEncryptionResult, V::Error>
            where
                V: MapAccess<'de>,
            {
                let mut ciphertext = None;
                let mut algorithm = None;
                let mut ciphertext_size = None;
                let mut shared_secret_size = None;
                let mut created_at = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        "ciphertext" => {
                            if ciphertext.is_some() {
                                return Err(de::Error::duplicate_field("ciphertext"));
                            }
                            ciphertext = Some(map.next_value()?);
                        }
                        "algorithm" => {
                            if algorithm.is_some() {
                                return Err(de::Error::duplicate_field("algorithm"));
                            }
                            algorithm = Some(map.next_value()?);
                        }
                        "ciphertext_size" => {
                            if ciphertext_size.is_some() {
                                return Err(de::Error::duplicate_field("ciphertext_size"));
                            }
                            ciphertext_size = Some(map.next_value()?);
                        }
                        "shared_secret_size" => {
                            if shared_secret_size.is_some() {
                                return Err(de::Error::duplicate_field("shared_secret_size"));
                            }
                            shared_secret_size = Some(map.next_value()?);
                        }
                        "created_at" => {
                            if created_at.is_some() {
                                return Err(de::Error::duplicate_field("created_at"));
                            }
                            created_at = Some(map.next_value()?);
                        }
                        _ => {
                            let _ = map.next_value::<de::IgnoredAny>()?;
                        }
                    }
                }

                let ciphertext = ciphertext.ok_or_else(|| de::Error::missing_field("ciphertext"))?;
                let algorithm = algorithm.ok_or_else(|| de::Error::missing_field("algorithm"))?;
                let ciphertext_size = ciphertext_size.ok_or_else(|| de::Error::missing_field("ciphertext_size"))?;
                let shared_secret_size = shared_secret_size.ok_or_else(|| de::Error::missing_field("shared_secret_size"))?;
                let created_at = created_at.ok_or_else(|| de::Error::missing_field("created_at"))?;

                Ok(PQCEncryptionResult {
                    ciphertext,
                    shared_secret: Secret::new(vec![]),
                    algorithm,
                    ciphertext_size,
                    shared_secret_size,
                    created_at,
                })
            }
        }

        deserializer.deserialize_struct("PQCEncryptionResult", &["ciphertext", "algorithm", "ciphertext_size", "shared_secret_size", "created_at"], PQCEncryptionResultVisitor)
    }
}

impl Drop for PQCEncryptionResult {
    fn drop(&mut self) {
        debug!("Securely dropping PQC encryption result for algorithm: {}", self.algorithm);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KyberMetrics {
    pub key_generation_time_ns: u64,
    pub encapsulation_time_ns: u64,
    pub decapsulation_time_ns: u64,
    pub public_key_size: usize,
    pub private_key_size: usize,
    pub ciphertext_size: usize,
    pub shared_secret_size: usize,
    pub operations_count: u64,
}

pub mod kyber;
pub mod dilithium;

use kyber::{KyberEngine, create_default_kyber_engine};
use std::sync::Mutex;
use once_cell::sync::Lazy;

static KYBER_ENGINE: Lazy<Mutex<KyberEngine>> = Lazy::new(|| {
    Mutex::new(create_default_kyber_engine())
});

pub fn generate_mlkem_keypair() -> PQCResult<PQCKeyPair> {
    let mut engine = KYBER_ENGINE.lock().map_err(|_| {
        PQCError::KeyGenerationFailed("Failed to acquire engine lock".to_string())
    })?;
    engine.generate_keypair()
}

pub fn generate_mldsa_keypair() -> PQCResult<PQCKeyPair> {
    let (pk, sk) = mldsa65::keypair();
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::KeyGenerationFailed("System time error".to_string()))?
        .as_secs();
    
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
    let mut engine = KYBER_ENGINE.lock().map_err(|_| {
        PQCError::EncapsulationFailed("Failed to acquire engine lock".to_string())
    })?;
    engine.encapsulate(public_key)
}

pub fn mlkem_decapsulate(private_key: &[u8], ciphertext: &[u8]) -> PQCResult<Vec<u8>> {
    let mut engine = KYBER_ENGINE.lock().map_err(|_| {
        PQCError::DecapsulationFailed("Failed to acquire engine lock".to_string())
    })?;
    let secret = engine.decapsulate(private_key, ciphertext)?;
    Ok(secret.expose_secret().clone())
}

pub fn mldsa_sign(private_key: &[u8], message: &[u8]) -> PQCResult<PQCSignature> {
    let sk = mldsa65::SecretKey::from_bytes(private_key)
        .map_err(|_| PQCError::InvalidPrivateKey("Failed to parse private key".to_string()))?;
    let signed_msg = mldsa65::sign(message, &sk);
    
    let current_time = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| PQCError::SigningFailed("System time error".to_string()))?
        .as_secs();
    
    Ok(PQCSignature {
        signature: signed_msg.as_bytes().to_vec(),
        algorithm: "ML-DSA-65".to_string(),
        signature_size: signed_msg.as_bytes().len(),
        created_at: current_time,
    })
}

pub fn mldsa_verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> PQCResult<bool> {
    let pk = mldsa65::PublicKey::from_bytes(public_key)
        .map_err(|_| PQCError::InvalidPublicKey("Failed to parse public key".to_string()))?;
    let signed_msg = mldsa65::SignedMessage::from_bytes(signature)
        .map_err(|_| PQCError::InvalidSignature("Failed to parse signature".to_string()))?;
    
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
        Ok((result.ciphertext.clone(), result.shared_secret.expose_secret().clone()))
    }

    pub fn decapsulate(private_key: &[u8], ciphertext: &[u8]) -> PQCResult<Vec<u8>> {
        super::mlkem_decapsulate(private_key, ciphertext)
    }
}

pub mod mldsa {
    use super::{PQCKeyPair, PQCResult};

    pub fn generate_keypair() -> PQCResult<PQCKeyPair> {
        super::generate_mldsa_keypair()
    }

    pub fn sign(private_key: &[u8], message: &[u8]) -> PQCResult<Vec<u8>> {
        let result = super::mldsa_sign(private_key, message)?;
        Ok(result.signature)
    }

    pub fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> PQCResult<bool> {
        super::mldsa_verify(public_key, message, signature)
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
        "Rust PQC Real Implementation: Received '{}' ({} bytes). ML-KEM-768 + ML-DSA-65 Ready!",
        input_str, input_len
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
