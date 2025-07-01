use std::sync::atomic::{compiler_fence, Ordering};
use subtle::{Choice, ConditionallySelectable};

pub struct ConstantTimeOps;

impl ConstantTimeOps {
    pub fn constant_time_compare(a: &[u8], b: &[u8]) -> bool {
        if a.len() != b.len() {
            return false;
        }

        let mut result = 0u8;
        for (byte_a, byte_b) in a.iter().zip(b.iter()) {
            result |= byte_a ^ byte_b;
        }

        result == 0
    }

    pub fn conditional_select(condition: bool, a: &[u8], b: &[u8]) -> Vec<u8> {
        assert_eq!(a.len(), b.len());
        let choice = Choice::from(condition as u8);

        a.iter()
            .zip(b.iter())
            .map(|(&byte_a, &byte_b)| u8::conditional_select(&byte_b, &byte_a, choice))
            .collect()
    }

    pub fn secure_copy(dest: &mut [u8], src: &[u8]) {
        assert_eq!(dest.len(), src.len());

        for (d, s) in dest.iter_mut().zip(src.iter()) {
            *d = *s;
        }

        compiler_fence(Ordering::SeqCst);
    }

    pub fn constant_time_lookup(array: &[u8], index: usize) -> u8 {
        let mut result = 0u8;

        for (i, &value) in array.iter().enumerate() {
            let mask = if i == index { 0xFF } else { 0x00 };
            result |= value & mask;
        }

        result
    }

    pub fn constant_time_str_eq(a: &str, b: &str) -> bool {
        Self::constant_time_compare(a.as_bytes(), b.as_bytes())
    }
}

#[cfg(test)]
mod constant_time_tests {
    use super::*;

    #[test]
    fn test_constant_time_compare() {
        let a = b"hello";
        let b = b"hello";
        let c = b"world";

        assert!(ConstantTimeOps::constant_time_compare(a, b));
        assert!(!ConstantTimeOps::constant_time_compare(a, c));
        assert!(!ConstantTimeOps::constant_time_compare(a, b"hell"));
    }

    #[test]
    fn test_conditional_select() {
        let a = b"option_a";
        let b = b"option_b";

        let result_true = ConstantTimeOps::conditional_select(true, a, b);
        let result_false = ConstantTimeOps::conditional_select(false, a, b);

        assert_eq!(result_true, a);
        assert_eq!(result_false, b);
    }

    #[test]
    fn test_secure_copy() {
        let src = b"test_data";
        let mut dest = vec![0u8; src.len()];

        ConstantTimeOps::secure_copy(&mut dest, src);
        assert_eq!(dest, src);
    }

    #[test]
    fn test_constant_time_lookup() {
        let array = &[10, 20, 30, 40, 50];

        assert_eq!(ConstantTimeOps::constant_time_lookup(array, 0), 10);
        assert_eq!(ConstantTimeOps::constant_time_lookup(array, 2), 30);
        assert_eq!(ConstantTimeOps::constant_time_lookup(array, 4), 50);
    }
}
