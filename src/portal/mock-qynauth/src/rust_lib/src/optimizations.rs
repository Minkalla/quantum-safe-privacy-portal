use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use rayon::prelude::*;
use pqcrypto_mlkem::mlkem768::{keypair as mlkem_keypair, PublicKey as MLKEMPublicKey, SecretKey as MLKEMSecretKey};
use pqcrypto_mldsa::mldsa65::{keypair as mldsa_keypair, PublicKey as MLDSAPublicKey, SecretKey as MLDSASecretKey, DetachedSignature as MLDSASignature, sign_detached, verify_detached};
use crate::errors::CryptoError;

#[derive(Debug, Clone)]
pub struct HardwareFeatures {
    pub avx2_available: bool,
    pub aes_ni_available: bool,
    pub sse4_available: bool,
    pub cpu_cores: usize,
}

impl HardwareFeatures {
    pub fn detect() -> Self {
        Self {
            avx2_available: is_x86_feature_detected!("avx2"),
            aes_ni_available: is_x86_feature_detected!("aes"),
            sse4_available: is_x86_feature_detected!("sse4.1"),
            cpu_cores: num_cpus::get(),
        }
    }

    pub fn optimal_batch_size(&self) -> usize {
        if self.avx2_available {
            self.cpu_cores * 4
        } else if self.sse4_available {
            self.cpu_cores * 2
        } else {
            self.cpu_cores
        }
    }
}

pub struct MemoryPool {
    kyber_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,
    dilithium_buffers: Arc<Mutex<VecDeque<Vec<u8>>>>,
    max_pool_size: usize,
}

impl MemoryPool {
    pub fn new(max_pool_size: usize) -> Self {
        Self {
            kyber_buffers: Arc::new(Mutex::new(VecDeque::new())),
            dilithium_buffers: Arc::new(Mutex::new(VecDeque::new())),
            max_pool_size,
        }
    }

    pub fn get_mlkem_buffer(&self) -> Vec<u8> {
        let mut buffers = self.kyber_buffers.lock().unwrap();
        buffers.pop_front().unwrap_or_else(|| {
            Vec::with_capacity(1184) // ML-KEM-768 public key size
        })
    }

    pub fn get_mldsa_buffer(&self) -> Vec<u8> {
        let mut buffers = self.dilithium_buffers.lock().unwrap();
        buffers.pop_front().unwrap_or_else(|| {
            Vec::with_capacity(1952) // ML-DSA-65 public key size
        })
    }

    pub fn return_mlkem_buffer(&self, mut buffer: Vec<u8>) {
        buffer.clear();
        let mut buffers = self.kyber_buffers.lock().unwrap();
        if buffers.len() < self.max_pool_size {
            buffers.push_back(buffer);
        }
    }

    pub fn return_mldsa_buffer(&self, mut buffer: Vec<u8>) {
        buffer.clear();
        let mut buffers = self.dilithium_buffers.lock().unwrap();
        if buffers.len() < self.max_pool_size {
            buffers.push_back(buffer);
        }
    }

    pub fn pool_stats(&self) -> (usize, usize) {
        let mlkem_count = self.kyber_buffers.lock().unwrap().len();
        let mldsa_count = self.dilithium_buffers.lock().unwrap().len();
        (mlkem_count, mldsa_count)
    }
}

#[derive(Debug)]
pub struct MLKEMKeyPair {
    pub public_key: MLKEMPublicKey,
    pub secret_key: MLKEMSecretKey,
}

#[derive(Debug)]
pub struct MLDSAKeyPair {
    pub public_key: MLDSAPublicKey,
    pub secret_key: MLDSASecretKey,
}

pub struct OptimizedCrypto {
    hardware_features: HardwareFeatures,
    memory_pool: MemoryPool,
    use_batch_operations: bool,
}

impl OptimizedCrypto {
    pub fn new() -> Self {
        let hardware_features = HardwareFeatures::detect();
        let pool_size = hardware_features.optimal_batch_size() * 2;
        
        Self {
            hardware_features,
            memory_pool: MemoryPool::new(pool_size),
            use_batch_operations: true,
        }
    }

    pub fn with_batch_operations(mut self, enabled: bool) -> Self {
        self.use_batch_operations = enabled;
        self
    }

    pub fn batch_mlkem_key_generation(&self, count: usize) -> Result<Vec<MLKEMKeyPair>, CryptoError> {
        if !self.use_batch_operations || count == 1 {
            return self.single_mlkem_key_generation(count);
        }

        let start_time = Instant::now();
        let batch_size = self.hardware_features.optimal_batch_size();
        
        let keypairs: Result<Vec<_>, _> = (0..count)
            .collect::<Vec<_>>()
            .par_chunks(batch_size)
            .map(|chunk| {
                chunk.iter().map(|_| {
                    let (pk, sk) = mlkem_keypair();
                    Ok(MLKEMKeyPair {
                        public_key: pk,
                        secret_key: sk,
                    })
                }).collect::<Result<Vec<_>, CryptoError>>()
            })
            .collect::<Result<Vec<_>, _>>()
            .map(|batches| batches.into_iter().flatten().collect());

        let duration = start_time.elapsed();
        tracing::info!(
            operation = "batch_mlkem_key_generation",
            count = count,
            duration_ms = duration.as_millis(),
            batch_size = batch_size,
            "Batch key generation completed"
        );

        keypairs
    }

    fn single_mlkem_key_generation(&self, count: usize) -> Result<Vec<MLKEMKeyPair>, CryptoError> {
        let mut keypairs = Vec::with_capacity(count);
        
        for _ in 0..count {
            let (pk, sk) = mlkem_keypair();
            keypairs.push(MLKEMKeyPair {
                public_key: pk,
                secret_key: sk,
            });
        }
        
        Ok(keypairs)
    }

    pub fn batch_mldsa_key_generation(&self, count: usize) -> Result<Vec<MLDSAKeyPair>, CryptoError> {
        if !self.use_batch_operations || count == 1 {
            return self.single_mldsa_key_generation(count);
        }

        let start_time = Instant::now();
        let batch_size = self.hardware_features.optimal_batch_size();
        
        let keypairs: Result<Vec<_>, _> = (0..count)
            .collect::<Vec<_>>()
            .par_chunks(batch_size)
            .map(|chunk| {
                chunk.iter().map(|_| {
                    let (pk, sk) = mldsa_keypair();
                    Ok(MLDSAKeyPair {
                        public_key: pk,
                        secret_key: sk,
                    })
                }).collect::<Result<Vec<_>, CryptoError>>()
            })
            .collect::<Result<Vec<_>, _>>()
            .map(|batches| batches.into_iter().flatten().collect());

        let duration = start_time.elapsed();
        tracing::info!(
            operation = "batch_mldsa_key_generation",
            count = count,
            duration_ms = duration.as_millis(),
            batch_size = batch_size,
            "Batch key generation completed"
        );

        keypairs
    }

    fn single_mldsa_key_generation(&self, count: usize) -> Result<Vec<MLDSAKeyPair>, CryptoError> {
        let mut keypairs = Vec::with_capacity(count);
        
        for _ in 0..count {
            let (pk, sk) = mldsa_keypair();
            keypairs.push(MLDSAKeyPair {
                public_key: pk,
                secret_key: sk,
            });
        }
        
        Ok(keypairs)
    }

    pub fn parallel_signature_verification(
        &self,
        signatures: &[(Vec<u8>, MLDSASignature, MLDSAPublicKey)]
    ) -> Result<Vec<bool>, CryptoError> {
        if signatures.is_empty() {
            return Ok(Vec::new());
        }

        let start_time = Instant::now();
        let batch_size = self.hardware_features.optimal_batch_size();

        let results: Vec<bool> = if self.use_batch_operations && signatures.len() > batch_size {
            signatures
                .par_chunks(batch_size)
                .map(|chunk| {
                    chunk.iter().map(|(message, signature, public_key)| {
                        verify_detached(signature, message, public_key).is_ok()
                    }).collect::<Vec<_>>()
                })
                .collect::<Vec<_>>()
                .into_iter()
                .flatten()
                .collect()
        } else {
            signatures.iter().map(|(message, signature, public_key)| {
                verify_detached(signature, message, public_key).is_ok()
            }).collect()
        };

        let duration = start_time.elapsed();
        tracing::info!(
            operation = "parallel_signature_verification",
            count = signatures.len(),
            duration_ms = duration.as_millis(),
            batch_size = batch_size,
            "Parallel verification completed"
        );

        Ok(results)
    }

    pub fn get_hardware_info(&self) -> &HardwareFeatures {
        &self.hardware_features
    }

    pub fn get_memory_pool_stats(&self) -> (usize, usize) {
        self.memory_pool.pool_stats()
    }

    pub fn benchmark_operations(&self) -> Result<OptimizationBenchmark, CryptoError> {
        let start_time = Instant::now();
        
        let key_gen_start = Instant::now();
        let _mlkem_keys = self.batch_mlkem_key_generation(10)?;
        let mlkem_key_gen_time = key_gen_start.elapsed();
        
        let mldsa_gen_start = Instant::now();
        let mldsa_keys = self.batch_mldsa_key_generation(10)?;
        let mldsa_key_gen_time = mldsa_gen_start.elapsed();
        
        let sign_start = Instant::now();
        let test_message = b"benchmark test message";
        let signatures: Vec<_> = mldsa_keys.iter().map(|keypair| {
            sign_detached(test_message, &keypair.secret_key)
        }).collect();
        let signing_time = sign_start.elapsed();
        
        let verify_start = Instant::now();
        let verification_data: Vec<_> = signatures.iter().zip(mldsa_keys.iter())
            .map(|(sig, keypair)| (test_message.to_vec(), *sig, keypair.public_key))
            .collect();
        let _verification_results = self.parallel_signature_verification(&verification_data)?;
        let verification_time = verify_start.elapsed();
        
        let total_time = start_time.elapsed();
        
        Ok(OptimizationBenchmark {
            mlkem_key_gen_time,
            mldsa_key_gen_time,
            signing_time,
            verification_time,
            total_time,
            hardware_features: self.hardware_features.clone(),
        })
    }
}

impl Default for OptimizedCrypto {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug)]
pub struct OptimizationBenchmark {
    pub mlkem_key_gen_time: Duration,
    pub mldsa_key_gen_time: Duration,
    pub signing_time: Duration,
    pub verification_time: Duration,
    pub total_time: Duration,
    pub hardware_features: HardwareFeatures,
}

impl OptimizationBenchmark {
    pub fn operations_per_second(&self) -> f64 {
        let total_ops = 40.0; // 10 kyber + 10 dilithium + 10 sign + 10 verify
        total_ops / self.total_time.as_secs_f64()
    }

    pub fn print_summary(&self) {
        println!("=== Optimization Benchmark Results ===");
        println!("Hardware Features:");
        println!("  AVX2: {}", self.hardware_features.avx2_available);
        println!("  AES-NI: {}", self.hardware_features.aes_ni_available);
        println!("  SSE4.1: {}", self.hardware_features.sse4_available);
        println!("  CPU Cores: {}", self.hardware_features.cpu_cores);
        println!();
        println!("Performance Metrics:");
        println!("  ML-KEM Key Generation (10 keys): {:?}", self.mlkem_key_gen_time);
        println!("  ML-DSA Key Generation (10 keys): {:?}", self.mldsa_key_gen_time);
        println!("  Signing (10 operations): {:?}", self.signing_time);
        println!("  Verification (10 operations): {:?}", self.verification_time);
        println!("  Total Time: {:?}", self.total_time);
        println!("  Operations per Second: {:.2}", self.operations_per_second());
    }
}

pub fn detect_hardware_features() -> HardwareFeatures {
    HardwareFeatures::detect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hardware_detection() {
        let features = detect_hardware_features();
        assert!(features.cpu_cores > 0);
        println!("Detected hardware features: {:?}", features);
    }

    #[test]
    fn test_memory_pool() {
        let pool = MemoryPool::new(5);
        
        let buffer1 = pool.get_mlkem_buffer();
        let buffer2 = pool.get_mldsa_buffer();
        
        assert!(buffer1.capacity() >= 1184);
        assert!(buffer2.capacity() >= 1952);
        
        pool.return_mlkem_buffer(buffer1);
        pool.return_mldsa_buffer(buffer2);
        
        let (mlkem_count, mldsa_count) = pool.pool_stats();
        assert_eq!(mlkem_count, 1);
        assert_eq!(mldsa_count, 1);
    }

    #[test]
    fn test_optimized_crypto_creation() {
        let crypto = OptimizedCrypto::new();
        let features = crypto.get_hardware_info();
        assert!(features.cpu_cores > 0);
    }

    #[test]
    fn test_batch_key_generation() {
        let crypto = OptimizedCrypto::new();
        
        let mlkem_keys = crypto.batch_mlkem_key_generation(5).unwrap();
        assert_eq!(mlkem_keys.len(), 5);
        
        let mldsa_keys = crypto.batch_mldsa_key_generation(3).unwrap();
        assert_eq!(mldsa_keys.len(), 3);
    }

    #[test]
    fn test_parallel_verification() {
        let crypto = OptimizedCrypto::new();
        let mldsa_keys = crypto.batch_mldsa_key_generation(3).unwrap();
        
        let test_message = b"test message for verification";
        let verification_data: Vec<_> = mldsa_keys.iter().map(|keypair| {
            let signature = sign_detached(test_message, &keypair.secret_key);
            (test_message.to_vec(), signature, keypair.public_key)
        }).collect();
        
        let results = crypto.parallel_signature_verification(&verification_data).unwrap();
        assert_eq!(results.len(), 3);
        assert!(results.iter().all(|&result| result));
    }

    #[test]
    fn test_benchmark() {
        let crypto = OptimizedCrypto::new();
        let benchmark = crypto.benchmark_operations().unwrap();
        
        assert!(benchmark.operations_per_second() > 0.0);
        benchmark.print_summary();
    }
}
