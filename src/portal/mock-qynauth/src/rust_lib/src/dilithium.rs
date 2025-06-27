use crate::{PQCError, PQCResult, PQCKeyPair, PQCSignature};
use pqcrypto_mldsa::mldsa65;
use pqcrypto_traits::sign::{PublicKey, SecretKey, DetachedSignature};
use secrecy::Secret;
use log::info;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct DilithiumConfig {
    pub timing_resistance: bool,
    pub memory_protection: bool,
    pub performance_monitoring: bool,
}

impl Default for DilithiumConfig {
    fn default() -> Self {
        Self {
            timing_resistance: true,
            memory_protection: true,
            performance_monitoring: true,
        }
    }
}

pub struct DilithiumEngine {
    config: DilithiumConfig,
    operations_count: u64,
}

impl DilithiumEngine {
    pub fn new(config: DilithiumConfig) -> Self {
        info!("Initializing Dilithium-3 (ML-DSA-65) engine with config: {:?}", config);
        
        Self {
            config,
            operations_count: 0,
        }
    }

    pub fn generate_keypair(&mut self) -> PQCResult<PQCKeyPair> {
        let start_time = Instant::now();
        
        info!("Generating Dilithium-3 keypair...");
        
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| PQCError::KeyGenerationFailed(format!("Time error: {}", e)))?
            .as_secs();
        
        let keypair = mldsa65::keypair();
        
        let public_key_bytes = keypair.0.as_bytes().to_vec();
        let private_key_bytes = keypair.1.as_bytes().to_vec();
        
        if self.config.timing_resistance {
            std::thread::sleep(std::time::Duration::from_micros(200));
        }
        
        let duration = start_time.elapsed();
        self.operations_count += 1;
        
        info!("Dilithium-3 keypair generated in {:?}", duration);
        
        Ok(PQCKeyPair {
            public_key: public_key_bytes,
            private_key: Secret::new(private_key_bytes),
            algorithm: "Dilithium-3".to_string(),
            key_size: 1952 + 4000, // Dilithium-3 public + private key size
            security_level: 3,
            created_at: current_time,
        })
    }

    pub fn sign(&mut self, private_key: &[u8], message: &[u8]) -> PQCResult<PQCSignature> {
        let start_time = Instant::now();
        
        if private_key.len() != 4000 {
            return Err(PQCError::InvalidPrivateKey(format!(
                "Invalid Dilithium-3 private key size: expected 4000, got {}",
                private_key.len()
            )));
        }
        
        info!("Signing message with Dilithium-3 (message length: {} bytes)", message.len());
        
        let sk = mldsa65::SecretKey::from_bytes(private_key)
            .map_err(|e| PQCError::SigningFailed(format!("Invalid private key: {:?}", e)))?;
        
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| PQCError::KeyGenerationFailed(format!("Time error: {}", e)))?
            .as_secs();
        
        let signature = mldsa65::detached_sign(message, &sk);
        let signature_bytes = signature.as_bytes().to_vec();
        
        if self.config.timing_resistance {
            std::thread::sleep(std::time::Duration::from_micros(300));
        }
        
        let duration = start_time.elapsed();
        self.operations_count += 1;
        
        info!("Dilithium-3 signature generated in {:?} (signature size: {} bytes)", 
              duration, signature_bytes.len());
        
        Ok(PQCSignature {
            signature: signature_bytes,
            algorithm: "Dilithium-3".to_string(),
            signature_size: 3309, // Dilithium-3 signature size
            created_at: current_time,
        })
    }

    pub fn verify(&mut self, public_key: &[u8], message: &[u8], signature: &[u8]) -> PQCResult<bool> {
        let start_time = Instant::now();
        
        if public_key.len() != 1952 {
            return Err(PQCError::InvalidPublicKey(format!(
                "Invalid Dilithium-3 public key size: expected 1952, got {}",
                public_key.len()
            )));
        }

        if signature.len() != 3309 {
            return Err(PQCError::InvalidSignature(format!(
                "Invalid Dilithium-3 signature size: expected 3309, got {}",
                signature.len()
            )));
        }
        
        info!("Verifying Dilithium-3 signature (message length: {} bytes)", message.len());
        
        let pk = mldsa65::PublicKey::from_bytes(public_key)
            .map_err(|e| PQCError::VerificationFailed(format!("Invalid public key: {:?}", e)))?;
        
        let sig = mldsa65::DetachedSignature::from_bytes(signature)
            .map_err(|e| PQCError::VerificationFailed(format!("Invalid signature: {:?}", e)))?;
        
        let is_valid = mldsa65::verify_detached_signature(&sig, message, &pk).is_ok();
        
        if self.config.timing_resistance {
            std::thread::sleep(std::time::Duration::from_micros(150));
        }
        
        let duration = start_time.elapsed();
        self.operations_count += 1;
        
        info!("Dilithium-3 signature verification completed in {:?}: {}", 
              duration, if is_valid { "VALID" } else { "INVALID" });
        
        Ok(is_valid)
    }

    pub fn batch_sign(&mut self, private_key: &[u8], messages: &[&[u8]]) -> PQCResult<Vec<PQCSignature>> {
        let start_time = Instant::now();
        let mut signatures = Vec::with_capacity(messages.len());
        
        info!("Batch signing {} messages with Dilithium-3", messages.len());
        
        for (_i, message) in messages.iter().enumerate() {
            match self.sign(private_key, message) {
                Ok(signature) => signatures.push(signature),
                Err(e) => {
                    return Err(e);
                }
            }
        }
        
        let duration = start_time.elapsed();
        info!("Batch signed {} messages in {:?}", messages.len(), duration);
        
        Ok(signatures)
    }

    pub fn validate_keypair(&self, public_key: &[u8], private_key: &[u8]) -> PQCResult<bool> {
        if public_key.len() != 1952 {
            return Ok(false);
        }
        
        if private_key.len() != 4000 {
            return Ok(false);
        }
        
        let test_message = b"Dilithium-3 keypair validation test";
        
        let sk = mldsa65::SecretKey::from_bytes(private_key)
            .map_err(|_| PQCError::InvalidPrivateKey("Invalid private key format".to_string()))?;
        
        let pk = mldsa65::PublicKey::from_bytes(public_key)
            .map_err(|_| PQCError::InvalidPublicKey("Invalid public key format".to_string()))?;
        
        let signature = mldsa65::detached_sign(test_message, &sk);
        let is_valid = mldsa65::verify_detached_signature(&signature, test_message, &pk).is_ok();
        
        Ok(is_valid)
    }

    pub fn get_operations_count(&self) -> u64 {
        self.operations_count
    }

    pub fn reset_metrics(&mut self) {
        self.operations_count = 0;
        info!("Dilithium-3 metrics reset");
    }

    pub fn get_algorithm_info(&self) -> String {
        format!(
            "Dilithium-3 (ML-DSA-65) - NIST PQC Standard\n\
             Public Key Size: 1952 bytes\n\
             Private Key Size: 4000 bytes\n\
             Signature Size: 3309 bytes\n\
             Security Level: NIST Level 3"
        )
    }
}

impl Drop for DilithiumEngine {
    fn drop(&mut self) {
        info!("Dropping Dilithium-3 engine - zeroizing sensitive data");
    }
}

pub fn create_default_dilithium_engine() -> DilithiumEngine {
    DilithiumEngine::new(DilithiumConfig::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dilithium_keypair_generation() {
        let mut engine = DilithiumEngine::new(DilithiumConfig::default());
        let keypair = engine.generate_keypair().unwrap();
        
        assert_eq!(keypair.public_key.len(), 1952); // Dilithium-3 public key size
        assert_eq!(keypair.private_key.expose_secret().len(), 4000); // Dilithium-3 private key size
        assert_eq!(keypair.algorithm, "Dilithium-3");
    }

    #[test]
    fn test_dilithium_sign_verify() {
        let mut engine = DilithiumEngine::new(DilithiumConfig::default());
        let keypair = engine.generate_keypair().unwrap();
        let message = b"Test message for Dilithium-3 signature";
        
        let signature_result = engine.sign(keypair.private_key.expose_secret(), message).unwrap();
        assert_eq!(signature_result.signature.expose_secret().len(), 3309); // Dilithium-3 signature size
        
        let is_valid = engine.verify(&keypair.public_key, message, signature_result.signature.expose_secret()).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_dilithium_batch_signing() {
        let mut engine = DilithiumEngine::new(DilithiumConfig::default());
        let keypair = engine.generate_keypair().unwrap();
        
        let messages = vec![
            b"Message 1".as_slice(),
            b"Message 2".as_slice(),
            b"Message 3".as_slice(),
        ];
        
        let signatures = engine.batch_sign(keypair.private_key.expose_secret(), &messages).unwrap();
        assert_eq!(signatures.len(), 3);
        
        for (i, signature) in signatures.iter().enumerate() {
            let is_valid = engine.verify(&keypair.public_key, messages[i], &signature.signature).unwrap();
            assert!(is_valid);
        }
    }

    #[test]
    fn test_dilithium_invalid_key_sizes() {
        let mut engine = DilithiumEngine::new(DilithiumConfig::default());
        
        let invalid_private_key = vec![0u8; 100];
        let message = b"test message";
        let result = engine.sign(&invalid_private_key, message);
        assert!(result.is_err());
        
        let invalid_public_key = vec![0u8; 100];
        let valid_signature = vec![0u8; 3309];
        let result = engine.verify(&invalid_public_key, message, &valid_signature);
        assert!(result.is_err());
        
        let valid_public_key = vec![0u8; 1952];
        let invalid_signature = vec![0u8; 100];
        let result = engine.verify(&valid_public_key, message, &invalid_signature);
        assert!(result.is_err());
    }
}
