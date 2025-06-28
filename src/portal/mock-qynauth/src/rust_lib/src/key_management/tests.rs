use super::*;
use crate::PQCError;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(test)]
mod key_management_tests {
    use super::*;

    fn create_test_manager() -> SecureKeyManager {
        SecureKeyManager::new()
    }

    #[test]
    fn test_key_manager_creation() {
        let manager = create_test_manager();
        assert_eq!(manager.get_key_count(), 0);
        assert!(manager.get_all_keys().is_empty());
    }

    #[test]
    fn test_generate_and_store_key_kyber() {
        let mut manager = create_test_manager();
        let user_id = "test_user_kyber";
        let algorithm = "Kyber-768";

        let result = manager.generate_and_store_key(user_id, algorithm);
        assert!(result.is_ok());

        let key_id = result.unwrap();
        assert!(!key_id.is_empty());
        assert_eq!(manager.get_key_count(), 1);

        let keys = manager.get_all_keys();
        assert_eq!(keys.len(), 1);
        let metadata = &keys[0];
        assert_eq!(metadata.user_id, user_id);
        assert_eq!(metadata.algorithm, algorithm);
        assert_eq!(metadata.status, KeyStatus::Active);
    }

    #[test]
    fn test_generate_and_store_key_dilithium() {
        let mut manager = create_test_manager();
        let user_id = "test_user_dilithium";
        let algorithm = "Dilithium-3";

        let result = manager.generate_and_store_key(user_id, algorithm);
        assert!(result.is_ok());

        let key_id = result.unwrap();
        assert!(!key_id.is_empty());
        assert_eq!(manager.get_key_count(), 1);

        let keys = manager.get_all_keys();
        assert_eq!(keys.len(), 1);
        let metadata = &keys[0];
        assert_eq!(metadata.user_id, user_id);
        assert_eq!(metadata.algorithm, algorithm);
        assert_eq!(metadata.status, KeyStatus::Active);
    }

    #[test]
    fn test_generate_multiple_keys_same_user() {
        let mut manager = create_test_manager();
        let user_id = "test_user_multiple";

        let kyber_result = manager.generate_and_store_key(user_id, "Kyber-768");
        let dilithium_result = manager.generate_and_store_key(user_id, "Dilithium-3");

        assert!(kyber_result.is_ok());
        assert!(dilithium_result.is_ok());
        assert_eq!(manager.get_key_count(), 2);

        let keys = manager.get_all_keys();
        assert_eq!(keys.len(), 2);
        
        for metadata in &keys {
            assert_eq!(metadata.user_id, user_id);
            assert_eq!(metadata.status, KeyStatus::Active);
        }

        let algorithms: Vec<&str> = keys.iter().map(|k| k.algorithm.as_str()).collect();
        assert!(algorithms.contains(&"Kyber-768"));
        assert!(algorithms.contains(&"Dilithium-3"));
    }

    #[test]
    fn test_get_active_keys_for_user() {
        let mut manager = create_test_manager();
        let user1 = "user1";
        let user2 = "user2";

        let _key1 = manager.generate_and_store_key(user1, "Kyber-768").unwrap();
        let _key2 = manager.generate_and_store_key(user2, "Dilithium-3").unwrap();
        let _key3 = manager.generate_and_store_key(user1, "Dilithium-3").unwrap();

        let user1_keys = manager.get_active_keys_for_user(user1);
        assert_eq!(user1_keys.len(), 2);
        for key in &user1_keys {
            assert_eq!(key.user_id, user1);
            assert_eq!(key.status, KeyStatus::Active);
        }

        let user2_keys = manager.get_active_keys_for_user(user2);
        assert_eq!(user2_keys.len(), 1);
        assert_eq!(user2_keys[0].user_id, user2);
        assert_eq!(user2_keys[0].algorithm, "Dilithium-3");

        let nonexistent_keys = manager.get_active_keys_for_user("nonexistent");
        assert!(nonexistent_keys.is_empty());
    }

    #[test]
    fn test_rotate_key() {
        let mut manager = create_test_manager();
        let user_id = "test_user_rotate";
        let algorithm = "Kyber-768";

        let original_key_id = manager.generate_and_store_key(user_id, algorithm).unwrap();
        assert_eq!(manager.get_key_count(), 1);

        let rotation_result = manager.rotate_key(&original_key_id);
        assert!(rotation_result.is_ok());

        let new_key_id = rotation_result.unwrap();
        assert_ne!(original_key_id, new_key_id);
        assert_eq!(manager.get_key_count(), 2); // Old key + new key

        let all_keys = manager.get_all_keys();
        let old_key = all_keys.iter().find(|k| k.key_id == original_key_id).unwrap();
        assert_eq!(old_key.status, KeyStatus::Rotating);

        let new_key = all_keys.iter().find(|k| k.key_id == new_key_id).unwrap();
        assert_eq!(new_key.status, KeyStatus::Active);
        assert_eq!(new_key.user_id, user_id);
        assert_eq!(new_key.algorithm, algorithm);
    }

    #[test]
    fn test_rotate_nonexistent_key() {
        let mut manager = create_test_manager();
        let nonexistent_key_id = "nonexistent_key";

        let result = manager.rotate_key(nonexistent_key_id);
        assert!(result.is_err());
        
        if let Err(PQCError::KeyNotFound(msg)) = result {
            assert_eq!(msg, "nonexistent_key");
        } else {
            panic!("Expected KeyNotFound error");
        }
    }

    #[test]
    fn test_revoke_key() {
        let mut manager = create_test_manager();
        let user_id = "test_user_revoke";
        let algorithm = "Dilithium-3";

        let key_id = manager.generate_and_store_key(user_id, algorithm).unwrap();
        assert_eq!(manager.get_key_count(), 1);

        let revoke_result = manager.revoke_key(&key_id);
        assert!(revoke_result.is_ok());

        let all_keys = manager.get_all_keys();
        let revoked_key = all_keys.iter().find(|k| k.key_id == key_id).unwrap();
        assert_eq!(revoked_key.status, KeyStatus::Revoked);

        let active_keys = manager.get_active_keys_for_user(user_id);
        assert!(active_keys.is_empty());
    }

    #[test]
    fn test_revoke_nonexistent_key() {
        let mut manager = create_test_manager();
        let nonexistent_key_id = "nonexistent_key";

        let result = manager.revoke_key(nonexistent_key_id);
        assert!(result.is_err());
        
        if let Err(PQCError::KeyNotFound(msg)) = result {
            assert_eq!(msg, "nonexistent_key");
        } else {
            panic!("Expected KeyNotFound error");
        }
    }

    #[test]
    fn test_cleanup_expired_keys() {
        let mut manager = create_test_manager();
        let user_id = "test_user_cleanup";

        let key_id = manager.generate_and_store_key(user_id, "Kyber-768").unwrap();
        assert_eq!(manager.get_key_count(), 1);

        if let Some((_, metadata)) = manager.keys.get_mut(&key_id) {
            metadata.status = KeyStatus::Expired;
        }

        let cleanup_result = manager.cleanup_expired_keys();
        assert!(cleanup_result.is_ok());

        let cleaned_count = cleanup_result.unwrap();
        assert_eq!(cleaned_count, 1);
        assert_eq!(manager.get_key_count(), 0);
    }

    #[test]
    fn test_cleanup_no_expired_keys() {
        let mut manager = create_test_manager();
        let user_id = "test_user_no_cleanup";

        let _key1 = manager.generate_and_store_key(user_id, "Kyber-768").unwrap();
        let _key2 = manager.generate_and_store_key(user_id, "Dilithium-3").unwrap();
        assert_eq!(manager.get_key_count(), 2);

        let cleanup_result = manager.cleanup_expired_keys();
        assert!(cleanup_result.is_ok());

        let cleaned_count = cleanup_result.unwrap();
        assert_eq!(cleaned_count, 0);
        assert_eq!(manager.get_key_count(), 2); // No keys should be removed
    }

    #[test]
    fn test_get_key_statistics() {
        let mut manager = create_test_manager();
        let user1 = "user1";
        let user2 = "user2";

        let key1 = manager.generate_and_store_key(user1, "Kyber-768").unwrap();
        let key2 = manager.generate_and_store_key(user2, "Dilithium-3").unwrap();
        let _key3 = manager.generate_and_store_key(user1, "Dilithium-3").unwrap();

        manager.revoke_key(&key2).unwrap();

        manager.rotate_key(&key1).unwrap();

        let stats = manager.get_key_statistics();
        
        assert_eq!(stats.get(&KeyStatus::Active).unwrap_or(&0), &2); // key3 + new rotated key
        assert_eq!(stats.get(&KeyStatus::Revoked).unwrap_or(&0), &1); // key2
        assert_eq!(stats.get(&KeyStatus::Rotating).unwrap_or(&0), &1); // original key1
    }

    #[test]
    fn test_unsupported_algorithm() {
        let mut manager = create_test_manager();
        let user_id = "test_user_unsupported";
        let unsupported_algorithm = "UnsupportedAlgorithm";

        let result = manager.generate_and_store_key(user_id, unsupported_algorithm);
        assert!(result.is_err());
        
        if let Err(PQCError::UnsupportedAlgorithm(msg)) = result {
            assert!(msg.contains("UnsupportedAlgorithm"));
        } else {
            panic!("Expected UnsupportedAlgorithm error");
        }

        assert_eq!(manager.get_key_count(), 0);
    }

    #[test]
    fn test_key_metadata_timestamps() {
        let mut manager = create_test_manager();
        let user_id = "test_user_timestamps";

        let before_generation = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let key_id = manager.generate_and_store_key(user_id, "Kyber-768").unwrap();

        let after_generation = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let keys = manager.get_all_keys();
        let metadata = keys.iter().find(|k| k.key_id == key_id).unwrap();

        assert!(metadata.created_at >= before_generation);
        assert!(metadata.created_at <= after_generation);
        assert!(metadata.expires_at.unwrap_or(0) > metadata.created_at);
    }

    #[test]
    fn test_concurrent_key_operations() {
        use std::sync::{Arc, Mutex};
        use std::thread;

        let manager = Arc::new(Mutex::new(create_test_manager()));
        let mut handles = vec![];

        for i in 0..5 {
            let manager_clone = Arc::clone(&manager);
            let handle = thread::spawn(move || {
                let user_id = format!("user_{i}");
                let mut mgr = manager_clone.lock().unwrap();
                mgr.generate_and_store_key(&user_id, "Kyber-768")
            });
            handles.push(handle);
        }

        let mut results = vec![];
        for handle in handles {
            results.push(handle.join().unwrap());
        }

        for result in results {
            assert!(result.is_ok());
        }

        let final_manager = manager.lock().unwrap();
        assert_eq!(final_manager.get_key_count(), 5);
    }

    #[test]
    fn test_key_id_uniqueness() {
        let mut manager = create_test_manager();
        let user_id = "test_user_uniqueness";
        let mut key_ids = std::collections::HashSet::new();

        for i in 0..10 {
            let algorithm = if i % 2 == 0 { "Kyber-768" } else { "Dilithium-3" };
            let key_id = manager.generate_and_store_key(user_id, algorithm).unwrap();
            
            assert!(!key_ids.contains(&key_id), "Duplicate key ID generated: {key_id}");
            key_ids.insert(key_id);
        }

        assert_eq!(key_ids.len(), 10);
        assert_eq!(manager.get_key_count(), 10);
    }

    #[test]
    fn test_hsm_integration_placeholder() {
        let mut manager = create_test_manager();
        let user_id = "test_user_hsm";

        let key_id = manager.generate_and_store_key(user_id, "Kyber-768").unwrap();
        
        let keys = manager.get_all_keys();
        let metadata = keys.iter().find(|k| k.key_id == key_id).unwrap();
        
        assert!(metadata.hsm_reference.is_none());
    }

    #[test]
    fn test_key_lifecycle_complete_flow() {
        let mut manager = create_test_manager();
        let user_id = "test_user_lifecycle";
        let algorithm = "Dilithium-3";

        let original_key_id = manager.generate_and_store_key(user_id, algorithm).unwrap();
        assert_eq!(manager.get_key_count(), 1);
        
        let active_keys = manager.get_active_keys_for_user(user_id);
        assert_eq!(active_keys.len(), 1);
        assert_eq!(active_keys[0].status, KeyStatus::Active);

        let new_key_id = manager.rotate_key(&original_key_id).unwrap();
        assert_eq!(manager.get_key_count(), 2);
        
        let active_keys = manager.get_active_keys_for_user(user_id);
        assert_eq!(active_keys.len(), 1); // Only new key should be active
        assert_eq!(active_keys[0].key_id, new_key_id);

        manager.revoke_key(&new_key_id).unwrap();
        
        let active_keys = manager.get_active_keys_for_user(user_id);
        assert!(active_keys.is_empty()); // No active keys

        if let Some((_, metadata)) = manager.keys.get_mut(&original_key_id) {
            metadata.status = KeyStatus::Expired;
        }
        
        let cleaned_count = manager.cleanup_expired_keys().unwrap();
        assert_eq!(cleaned_count, 1);
        assert_eq!(manager.get_key_count(), 1); // Only revoked key remains
    }
}
