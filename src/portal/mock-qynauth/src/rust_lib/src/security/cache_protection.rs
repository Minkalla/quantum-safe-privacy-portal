#[cfg(target_arch = "x86_64")]
use std::arch::x86_64::*;

pub struct CacheProtection;

impl CacheProtection {
    pub fn cache_safe_lookup(table: &[u8], index: usize) -> u8 {
        let mut result = 0u8;

        for (i, &value) in table.iter().enumerate() {
            let mask = if i == index { 0xFF } else { 0x00 };
            result |= value & mask;
        }

        result
    }

    pub fn safe_table_lookup(table: &[u8], index: usize) -> Option<u8> {
        if index >= table.len() {
            return None;
        }

        Some(Self::cache_safe_lookup(table, index))
    }

    #[cfg(target_arch = "x86_64")]
    pub fn flush_cache_lines(data: &[u8]) {
        unsafe {
            for chunk in data.chunks(64) {
                // 64-byte cache line size
                _mm_clflush(chunk.as_ptr());
            }
            _mm_mfence(); // Memory fence
        }
    }

    #[cfg(not(target_arch = "x86_64"))]
    pub fn flush_cache_lines(_data: &[u8]) {}

    #[cfg(target_arch = "x86_64")]
    pub fn normalize_cache_state(data: &[u8]) {
        unsafe {
            for chunk in data.chunks(64) {
                _mm_prefetch(chunk.as_ptr() as *const i8, _MM_HINT_T0);
            }
        }
    }

    #[cfg(not(target_arch = "x86_64"))]
    pub fn normalize_cache_state(_data: &[u8]) {}

    pub fn cache_safe_compare(a: &[u8], b: &[u8]) -> bool {
        if a.len() != b.len() {
            return false;
        }

        let mut result = 0u8;

        for i in 0..a.len() {
            result |= a[i] ^ b[i];
        }

        result == 0
    }

    pub fn cache_safe_string_search(haystack: &str, needle: &str) -> bool {
        let haystack_bytes = haystack.as_bytes();
        let needle_bytes = needle.as_bytes();

        if needle_bytes.is_empty() {
            return true;
        }

        if needle_bytes.len() > haystack_bytes.len() {
            return false;
        }

        let mut found = false;

        for i in 0..=(haystack_bytes.len() - needle_bytes.len()) {
            let mut matches = true;

            for j in 0..needle_bytes.len() {
                if haystack_bytes[i + j] != needle_bytes[j] {
                    matches = false;
                }
            }

            if matches {
                found = true;
            }
        }

        found
    }

    pub fn cache_safe_init(size: usize, value: u8) -> Vec<u8> {
        let mut result = Vec::with_capacity(size);

        for _ in 0..size {
            result.push(value);
        }

        Self::flush_cache_lines(&result);

        result
    }

    pub fn cache_safe_zero(data: &mut [u8]) {
        for byte in data.iter_mut() {
            *byte = 0;
        }

        Self::flush_cache_lines(data);
    }
}

#[cfg(test)]
mod cache_protection_tests {
    use super::*;

    #[test]
    fn test_cache_safe_lookup() {
        let table = &[10, 20, 30, 40, 50];

        assert_eq!(CacheProtection::cache_safe_lookup(table, 0), 10);
        assert_eq!(CacheProtection::cache_safe_lookup(table, 2), 30);
        assert_eq!(CacheProtection::cache_safe_lookup(table, 4), 50);
    }

    #[test]
    fn test_safe_table_lookup() {
        let table = &[10, 20, 30];

        assert_eq!(CacheProtection::safe_table_lookup(table, 1), Some(20));
        assert_eq!(CacheProtection::safe_table_lookup(table, 5), None);
    }

    #[test]
    fn test_cache_safe_compare() {
        let a = b"hello";
        let b = b"hello";
        let c = b"world";

        assert!(CacheProtection::cache_safe_compare(a, b));
        assert!(!CacheProtection::cache_safe_compare(a, c));
    }

    #[test]
    fn test_cache_safe_string_search() {
        assert!(CacheProtection::cache_safe_string_search(
            "hello world",
            "world"
        ));
        assert!(CacheProtection::cache_safe_string_search(
            "hello world",
            "hello"
        ));
        assert!(!CacheProtection::cache_safe_string_search(
            "hello world",
            "xyz"
        ));
        assert!(CacheProtection::cache_safe_string_search("test", ""));
    }

    #[test]
    fn test_cache_safe_init() {
        let data = CacheProtection::cache_safe_init(10, 42);
        assert_eq!(data.len(), 10);
        assert!(data.iter().all(|&x| x == 42));
    }

    #[test]
    fn test_cache_safe_zero() {
        let mut data = vec![1, 2, 3, 4, 5];
        CacheProtection::cache_safe_zero(&mut data);
        assert!(data.iter().all(|&x| x == 0));
    }
}
