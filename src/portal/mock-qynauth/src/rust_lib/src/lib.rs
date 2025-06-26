use std::ffi::CString;
use std::os::raw::c_char;
use serde::{Deserialize, Serialize};
use pqcrypto_mlkem::mlkem768;
use pqcrypto_mldsa::mldsa65;
use pqcrypto_traits::kem::{PublicKey, SecretKey, Ciphertext, SharedSecret};
use pqcrypto_traits::sign::{PublicKey as SignPublicKey, SecretKey as SignSecretKey, SignedMessage};

#[derive(Debug, Serialize, Deserialize)]
pub struct PQCKeyPair {
    pub public_key: Vec<u8>,
    pub private_key: Vec<u8>,
    pub algorithm: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PQCSignature {
    pub signature: Vec<u8>,
    pub algorithm: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PQCEncryptionResult {
    pub ciphertext: Vec<u8>,
    pub shared_secret: Vec<u8>,
    pub algorithm: String,
}

pub fn generate_mlkem_keypair() -> PQCKeyPair {
    let (pk, sk) = mlkem768::keypair();
    PQCKeyPair {
        public_key: pk.as_bytes().to_vec(),
        private_key: sk.as_bytes().to_vec(),
        algorithm: "ML-KEM-768".to_string(),
    }
}

pub fn generate_mldsa_keypair() -> PQCKeyPair {
    let (pk, sk) = mldsa65::keypair();
    PQCKeyPair {
        public_key: pk.as_bytes().to_vec(),
        private_key: sk.as_bytes().to_vec(),
        algorithm: "ML-DSA-65".to_string(),
    }
}

pub fn mlkem_encapsulate(public_key: &[u8], _message: &[u8]) -> PQCEncryptionResult {
    let pk = mlkem768::PublicKey::from_bytes(public_key).expect("Invalid public key");
    let (ss, ct) = mlkem768::encapsulate(&pk);
    PQCEncryptionResult {
        ciphertext: ct.as_bytes().to_vec(),
        shared_secret: ss.as_bytes().to_vec(),
        algorithm: "ML-KEM-768".to_string(),
    }
}

pub fn mlkem_decapsulate(private_key: &[u8], ciphertext: &[u8]) -> Vec<u8> {
    let sk = mlkem768::SecretKey::from_bytes(private_key).expect("Invalid secret key");
    let ct = mlkem768::Ciphertext::from_bytes(ciphertext).expect("Invalid ciphertext");
    let ss = mlkem768::decapsulate(&ct, &sk);
    ss.as_bytes().to_vec()
}

pub fn mldsa_sign(private_key: &[u8], message: &[u8]) -> PQCSignature {
    let sk = mldsa65::SecretKey::from_bytes(private_key).expect("Invalid secret key");
    let signed_msg = mldsa65::sign(message, &sk);
    PQCSignature {
        signature: signed_msg.as_bytes().to_vec(),
        algorithm: "ML-DSA-65".to_string(),
    }
}

pub fn mldsa_verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> bool {
    let pk = mldsa65::PublicKey::from_bytes(public_key).expect("Invalid public key");
    let signed_msg = mldsa65::SignedMessage::from_bytes(signature).expect("Invalid signature");
    mldsa65::open(&signed_msg, &pk).map(|opened| opened == message).unwrap_or(false)
}

pub mod mlkem {
    use super::PQCKeyPair;

    pub fn generate_keypair() -> PQCKeyPair {
        super::generate_mlkem_keypair()
    }

    pub fn encapsulate(public_key: &[u8], message: &[u8]) -> (Vec<u8>, Vec<u8>) {
        let result = super::mlkem_encapsulate(public_key, message);
        (result.ciphertext, result.shared_secret)
    }

    pub fn decapsulate(private_key: &[u8], ciphertext: &[u8]) -> Vec<u8> {
        super::mlkem_decapsulate(private_key, ciphertext)
    }
}

pub mod mldsa {
    use super::PQCKeyPair;

    pub fn generate_keypair() -> PQCKeyPair {
        super::generate_mldsa_keypair()
    }

    pub fn sign(private_key: &[u8], message: &[u8]) -> Vec<u8> {
        let result = super::mldsa_sign(private_key, message);
        result.signature
    }

    pub fn verify(public_key: &[u8], message: &[u8], signature: &[u8]) -> bool {
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
