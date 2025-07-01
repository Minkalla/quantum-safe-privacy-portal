use rand::RngCore;
use sha2::{Digest, Sha256};

pub struct PowerAnalysisProtection {
    dummy_operations: bool,
    operation_masking: bool,
}

impl PowerAnalysisProtection {
    pub fn new() -> Self {
        Self {
            dummy_operations: true,
            operation_masking: true,
        }
    }

    pub fn with_settings(dummy_operations: bool, operation_masking: bool) -> Self {
        Self {
            dummy_operations,
            operation_masking,
        }
    }

    pub fn protected_operation<F, R>(&self, operation: F) -> R
    where
        F: FnOnce() -> R,
    {
        if self.dummy_operations {
            self.perform_dummy_operations();
        }

        let result = operation();

        if self.dummy_operations {
            self.perform_dummy_operations();
        }

        result
    }

    fn perform_dummy_operations(&self) {
        let mut rng = rand::thread_rng();
        let dummy_data = [0u8; 32];

        for _ in 0..rng.next_u32() % 10 {
            let _ = self.dummy_hash(&dummy_data);
        }

        let mut dummy_result = 0u64;
        for i in 0..rng.next_u32() % 20 {
            dummy_result = dummy_result.wrapping_add(i as u64);
            dummy_result = dummy_result.wrapping_mul(3);
        }

        std::hint::black_box(dummy_result);
    }

    fn dummy_hash(&self, data: &[u8]) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(data);
        hasher.finalize().into()
    }

    pub fn protected_key_generation<F, K>(&self, key_gen_fn: F) -> K
    where
        F: FnOnce() -> K,
    {
        self.protected_operation(|| {
            self.random_delay();
            key_gen_fn()
        })
    }

    pub fn protected_signature<F, S>(&self, sign_fn: F) -> S
    where
        F: FnOnce() -> S,
    {
        self.protected_operation(|| {
            self.dummy_signature_operations();
            sign_fn()
        })
    }

    fn random_delay(&self) {
        let mut rng = rand::thread_rng();
        let delay_cycles = rng.next_u32() % 1000;

        for _ in 0..delay_cycles {
            std::hint::black_box(());
        }
    }

    fn dummy_signature_operations(&self) {
        let dummy_message = b"dummy_message_for_power_masking";
        let dummy_key = [0u8; 32];

        for _ in 0..3 {
            let _ = self.dummy_hash(dummy_message);
            let _ = self.dummy_hash(&dummy_key);
        }
    }
}

impl Default for PowerAnalysisProtection {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod power_analysis_tests {
    use super::*;

    #[test]
    fn test_protected_operation() {
        let protection = PowerAnalysisProtection::new();

        let result = protection.protected_operation(|| 42u32);

        assert_eq!(result, 42);
    }

    #[test]
    fn test_protected_key_generation() {
        let protection = PowerAnalysisProtection::new();

        let key = protection.protected_key_generation(|| [1u8; 32]);

        assert_eq!(key, [1u8; 32]);
    }

    #[test]
    fn test_protected_signature() {
        let protection = PowerAnalysisProtection::new();

        let signature = protection.protected_signature(|| "dummy_signature".to_string());

        assert_eq!(signature, "dummy_signature");
    }

    #[test]
    fn test_custom_settings() {
        let protection = PowerAnalysisProtection::with_settings(false, true);

        let result = protection.protected_operation(|| "test".to_string());

        assert_eq!(result, "test");
    }
}
