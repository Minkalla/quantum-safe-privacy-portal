
pub mod side_channel;
pub mod power_analysis;
pub mod cache_protection;

pub use side_channel::ConstantTimeOps;
pub use power_analysis::PowerAnalysisProtection;
pub use cache_protection::CacheProtection;

pub struct SideChannelProtection {
    constant_time: ConstantTimeOps,
    power_analysis: PowerAnalysisProtection,
    cache_protection: CacheProtection,
}

impl SideChannelProtection {
    pub fn new() -> Self {
        Self {
            constant_time: ConstantTimeOps,
            power_analysis: PowerAnalysisProtection::new(),
            cache_protection: CacheProtection,
        }
    }
    
    pub fn constant_time(&self) -> &ConstantTimeOps {
        &self.constant_time
    }
    
    pub fn power_analysis(&self) -> &PowerAnalysisProtection {
        &self.power_analysis
    }
    
    pub fn cache_protection(&self) -> &CacheProtection {
        &self.cache_protection
    }
    
    pub fn protected_crypto_operation<F, R>(&self, operation: F) -> R
    where
        F: FnOnce() -> R,
    {
        self.power_analysis.protected_operation(operation)
    }
    
    pub fn secure_compare(&self, a: &[u8], b: &[u8]) -> bool {
        self.power_analysis.protected_operation(|| {
            ConstantTimeOps::constant_time_compare(a, b)
        })
    }
    
    pub fn secure_lookup(&self, table: &[u8], index: usize) -> u8 {
        self.power_analysis.protected_operation(|| {
            CacheProtection::cache_safe_lookup(table, index)
        })
    }
}

impl Default for SideChannelProtection {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod security_tests {
    use super::*;
    
    #[test]
    fn test_side_channel_protection() {
        let protection = SideChannelProtection::new();
        
        let a = b"test_data";
        let b = b"test_data";
        let c = b"different";
        
        assert!(protection.secure_compare(a, b));
        assert!(!protection.secure_compare(a, c));
    }
    
    #[test]
    fn test_secure_lookup() {
        let protection = SideChannelProtection::new();
        let table = &[10, 20, 30, 40, 50];
        
        assert_eq!(protection.secure_lookup(table, 2), 30);
    }
    
    #[test]
    fn test_protected_crypto_operation() {
        let protection = SideChannelProtection::new();
        
        let result = protection.protected_crypto_operation(|| {
            "crypto_result".to_string()
        });
        
        assert_eq!(result, "crypto_result");
    }
}
