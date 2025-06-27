use crate::{PQCError, PQCResult, PQCKeyPair, PQCEncryptionResult, KyberMetrics};
use pqcrypto_mlkem::mlkem768;
use pqcrypto_traits::kem::{PublicKey, SecretKey, Ciphertext, SharedSecret};
use secrecy::{Secret, ExposeSecret};
use log::{info, warn, error, debug};
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use std::sync::atomic::{AtomicU64, Ordering};

static KYBER_OPERATIONS_COUNTER: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone)]
pub struct KyberConfig {
    pub enable_timing_resistance: bool,
    pub enable_memory_protection: bool,
    pub enable_metrics_collection: bool,
    pub max_operations_per_second: Option<u64>,
}

impl Default for KyberConfig {
    fn default() -> Self {
        Self {
            enable_timing_resistance: true,
            enable_memory_protection: true,
            enable_metrics_collection: true,
            max_operations_per_second: Some(1000),
        }
    }
}

#[derive(Debug)]
pub struct KyberEngine {
    config: KyberConfig,
    metrics: KyberMetrics,
}

impl KyberEngine {
    pub fn new(config: KyberConfig) -> Self {
        info!("Initializing Kyber-768 engine with security configuration");
        Self {
            config,
            metrics: KyberMetrics {
                key_generation_time_ns: 0,
                encapsulation_time_ns: 0,
                decapsulation_time_ns: 0,
                public_key_size: mlkem768::public_key_bytes(),
                private_key_size: mlkem768::secret_key_bytes(),
                ciphertext_size: mlkem768::ciphertext_bytes(),
                shared_secret_size: mlkem768::shared_secret_bytes(),
                operations_count: 0,
            },
        }
    }

    pub fn generate_keypair(&mut self) -> PQCResult<PQCKeyPair> {
        let start_time = Instant::now();
        
        debug!("Starting Kyber-768 key generation");
        
        if let Some(max_ops) = self.config.max_operations_per_second {
            let current_ops = KYBER_OPERATIONS_COUNTER.load(Ordering::Relaxed);
            if current_ops > max_ops {
                warn!("Rate limit exceeded for Kyber operations");
                return Err(PQCError::SecurityValidationFailed(
                    "Rate limit exceeded".to_string()
                ));
            }
        }

        let (pk, sk) = mlkem768::keypair();
        
        let elapsed = start_time.elapsed();
        self.metrics.key_generation_time_ns = elapsed.as_nanos() as u64;
        self.metrics.operations_count += 1;
        KYBER_OPERATIONS_COUNTER.fetch_add(1, Ordering::Relaxed);

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| PQCError::KeyGenerationFailed("System time error".to_string()))?
            .as_secs();

        let keypair = PQCKeyPair {
            public_key: pk.as_bytes().to_vec(),
            private_key: Secret::new(sk.as_bytes().to_vec()),
            algorithm: "ML-KEM-768".to_string(),
            key_size: mlkem768::public_key_bytes() + mlkem768::secret_key_bytes(),
            security_level: 3,
            created_at: current_time,
        };

        info!("Kyber-768 keypair generated successfully in {}μs", elapsed.as_micros());
        Ok(keypair)
    }

    pub fn encapsulate(&mut self, public_key: &[u8]) -> PQCResult<PQCEncryptionResult> {
        let start_time = Instant::now();
        
        debug!("Starting Kyber-768 encapsulation");

        if public_key.len() != mlkem768::public_key_bytes() {
            error!("Invalid public key size: expected {}, got {}", 
                   mlkem768::public_key_bytes(), public_key.len());
            return Err(PQCError::InvalidPublicKey(
                format!("Expected {} bytes, got {}", mlkem768::public_key_bytes(), public_key.len())
            ));
        }

        let pk = mlkem768::PublicKey::from_bytes(public_key)
            .map_err(|_| PQCError::InvalidPublicKey("Failed to parse public key".to_string()))?;

        let (ss, ct) = mlkem768::encapsulate(&pk);
        
        let elapsed = start_time.elapsed();
        self.metrics.encapsulation_time_ns = elapsed.as_nanos() as u64;
        self.metrics.operations_count += 1;
        KYBER_OPERATIONS_COUNTER.fetch_add(1, Ordering::Relaxed);

        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| PQCError::EncapsulationFailed("System time error".to_string()))?
            .as_secs();

        let result = PQCEncryptionResult {
            ciphertext: ct.as_bytes().to_vec(),
            shared_secret: Secret::new(ss.as_bytes().to_vec()),
            algorithm: "ML-KEM-768".to_string(),
            ciphertext_size: mlkem768::ciphertext_bytes(),
            shared_secret_size: mlkem768::shared_secret_bytes(),
            created_at: current_time,
        };

        info!("Kyber-768 encapsulation completed successfully in {}μs", elapsed.as_micros());
        Ok(result)
    }

    pub fn decapsulate(&mut self, private_key: &[u8], ciphertext: &[u8]) -> PQCResult<Secret<Vec<u8>>> {
        let start_time = Instant::now();
        
        debug!("Starting Kyber-768 decapsulation");

        if private_key.len() != mlkem768::secret_key_bytes() {
            error!("Invalid private key size: expected {}, got {}", 
                   mlkem768::secret_key_bytes(), private_key.len());
            return Err(PQCError::InvalidPrivateKey(
                format!("Expected {} bytes, got {}", mlkem768::secret_key_bytes(), private_key.len())
            ));
        }

        if ciphertext.len() != mlkem768::ciphertext_bytes() {
            error!("Invalid ciphertext size: expected {}, got {}", 
                   mlkem768::ciphertext_bytes(), ciphertext.len());
            return Err(PQCError::InvalidCiphertext(
                format!("Expected {} bytes, got {}", mlkem768::ciphertext_bytes(), ciphertext.len())
            ));
        }

        let sk = mlkem768::SecretKey::from_bytes(private_key)
            .map_err(|_| PQCError::InvalidPrivateKey("Failed to parse private key".to_string()))?;
        
        let ct = mlkem768::Ciphertext::from_bytes(ciphertext)
            .map_err(|_| PQCError::InvalidCiphertext("Failed to parse ciphertext".to_string()))?;

        let ss = mlkem768::decapsulate(&ct, &sk);
        
        let elapsed = start_time.elapsed();
        self.metrics.decapsulation_time_ns = elapsed.as_nanos() as u64;
        self.metrics.operations_count += 1;
        KYBER_OPERATIONS_COUNTER.fetch_add(1, Ordering::Relaxed);

        info!("Kyber-768 decapsulation completed successfully in {}μs", elapsed.as_micros());
        Ok(Secret::new(ss.as_bytes().to_vec()))
    }

    pub fn batch_generate_keypairs(&mut self, count: usize) -> PQCResult<Vec<PQCKeyPair>> {
        info!("Starting batch generation of {} Kyber-768 keypairs", count);
        
        if count > 1000 {
            warn!("Large batch size requested: {}", count);
            return Err(PQCError::SecurityValidationFailed(
                "Batch size too large".to_string()
            ));
        }

        let mut keypairs = Vec::with_capacity(count);
        for i in 0..count {
            debug!("Generating keypair {}/{}", i + 1, count);
            keypairs.push(self.generate_keypair()?);
        }

        info!("Successfully generated {} Kyber-768 keypairs", count);
        Ok(keypairs)
    }

    pub fn validate_keypair(&self, keypair: &PQCKeyPair) -> PQCResult<bool> {
        debug!("Validating Kyber-768 keypair");

        if keypair.algorithm != "ML-KEM-768" {
            return Err(PQCError::SecurityValidationFailed(
                format!("Expected ML-KEM-768, got {}", keypair.algorithm)
            ));
        }

        if keypair.public_key.len() != mlkem768::public_key_bytes() {
            return Err(PQCError::SecurityValidationFailed(
                "Invalid public key size".to_string()
            ));
        }

        if keypair.private_key.expose_secret().len() != mlkem768::secret_key_bytes() {
            return Err(PQCError::SecurityValidationFailed(
                "Invalid private key size".to_string()
            ));
        }

        if keypair.security_level != 3 {
            return Err(PQCError::SecurityValidationFailed(
                "Invalid security level".to_string()
            ));
        }

        debug!("Kyber-768 keypair validation successful");
        Ok(true)
    }

    pub fn get_metrics(&self) -> &KyberMetrics {
        &self.metrics
    }

    pub fn reset_metrics(&mut self) {
        debug!("Resetting Kyber-768 metrics");
        self.metrics = KyberMetrics {
            key_generation_time_ns: 0,
            encapsulation_time_ns: 0,
            decapsulation_time_ns: 0,
            public_key_size: mlkem768::public_key_bytes(),
            private_key_size: mlkem768::secret_key_bytes(),
            ciphertext_size: mlkem768::ciphertext_bytes(),
            shared_secret_size: mlkem768::shared_secret_bytes(),
            operations_count: 0,
        };
    }

    pub fn get_algorithm_info() -> (&'static str, u8, usize, usize, usize, usize) {
        (
            "ML-KEM-768",
            3, // Security level
            mlkem768::public_key_bytes(),
            mlkem768::secret_key_bytes(),
            mlkem768::ciphertext_bytes(),
            mlkem768::shared_secret_bytes(),
        )
    }
}

impl Drop for KyberEngine {
    fn drop(&mut self) {
        info!("Kyber-768 engine dropped, total operations: {}", self.metrics.operations_count);
    }
}

pub fn create_default_kyber_engine() -> KyberEngine {
    KyberEngine::new(KyberConfig::default())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kyber_keypair_generation() {
        let mut engine = create_default_kyber_engine();
        let keypair = engine.generate_keypair().unwrap();
        
        assert_eq!(keypair.algorithm, "ML-KEM-768");
        assert_eq!(keypair.security_level, 3);
        assert_eq!(keypair.public_key.len(), mlkem768::public_key_bytes());
        assert_eq!(keypair.private_key.expose_secret().len(), mlkem768::secret_key_bytes());
    }

    #[test]
    fn test_kyber_encapsulation_decapsulation() {
        let mut engine = create_default_kyber_engine();
        let keypair = engine.generate_keypair().unwrap();
        
        let encryption_result = engine.encapsulate(&keypair.public_key).unwrap();
        let decrypted_secret = engine.decapsulate(
            keypair.private_key.expose_secret(),
            &encryption_result.ciphertext
        ).unwrap();
        
        assert_eq!(
            encryption_result.shared_secret.expose_secret(),
            decrypted_secret.expose_secret()
        );
    }

    #[test]
    fn test_kyber_batch_generation() {
        let mut engine = create_default_kyber_engine();
        let keypairs = engine.batch_generate_keypairs(5).unwrap();
        
        assert_eq!(keypairs.len(), 5);
        for keypair in &keypairs {
            assert!(engine.validate_keypair(keypair).unwrap());
        }
    }

    #[test]
    fn test_kyber_invalid_key_sizes() {
        let mut engine = create_default_kyber_engine();
        
        let invalid_public_key = vec![0u8; 10];
        let result = engine.encapsulate(&invalid_public_key);
        assert!(result.is_err());
        
        let invalid_private_key = vec![0u8; 10];
        let invalid_ciphertext = vec![0u8; 10];
        let result = engine.decapsulate(&invalid_private_key, &invalid_ciphertext);
        assert!(result.is_err());
    }
}
