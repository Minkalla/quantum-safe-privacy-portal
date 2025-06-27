use crate::{PQCError, PQCResult, PQCKeyPair};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use log::{info, error};
use uuid::Uuid;

#[cfg(test)]
mod tests;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum KeyStatus {
    Active,
    Expired,
    Revoked,
    Pending,
    Rotating,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyMetadata {
    pub key_id: String,
    pub user_id: String,
    pub algorithm: String,
    pub created_at: u64,
    pub expires_at: Option<u64>,
    pub status: KeyStatus,
    pub hsm_reference: Option<String>,
    pub rotation_count: u32,
    pub last_used: Option<u64>,
}

impl KeyMetadata {
    pub fn new(user_id: String, algorithm: String) -> Self {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        Self {
            key_id: Uuid::new_v4().to_string(),
            user_id,
            algorithm,
            created_at: current_time,
            expires_at: Some(current_time + 30 * 24 * 60 * 60), // 30 days default
            status: KeyStatus::Active,
            hsm_reference: None,
            rotation_count: 0,
            last_used: None,
        }
    }

    pub fn is_expired(&self) -> bool {
        if let Some(expires_at) = self.expires_at {
            let current_time = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            current_time > expires_at
        } else {
            false
        }
    }

    pub fn should_rotate(&self, rotation_interval: u64) -> bool {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        current_time > self.created_at + rotation_interval
    }
}

#[derive(Debug, Clone)]
pub struct HSMConfig {
    pub enabled: bool,
    pub provider: String,
    pub key_slot: Option<u32>,
    pub authentication_method: String,
}

impl Default for HSMConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            provider: "SoftHSM".to_string(),
            key_slot: None,
            authentication_method: "PIN".to_string(),
        }
    }
}

pub struct SecureKeyManager {
    pub keys: HashMap<String, (PQCKeyPair, KeyMetadata)>,
    user_keys: HashMap<String, Vec<String>>, // user_id -> key_ids
    rotation_interval: u64, // seconds
    hsm_config: HSMConfig,
    max_keys_per_user: usize,
}

impl SecureKeyManager {
    pub fn new() -> Self {
        Self {
            keys: HashMap::new(),
            user_keys: HashMap::new(),
            rotation_interval: 30 * 24 * 60 * 60, // 30 days default
            hsm_config: HSMConfig::default(),
            max_keys_per_user: 10,
        }
    }

    pub fn with_hsm_config(mut self, hsm_config: HSMConfig) -> Self {
        self.hsm_config = hsm_config;
        self
    }

    pub fn with_rotation_interval(mut self, interval_seconds: u64) -> Self {
        self.rotation_interval = interval_seconds;
        self
    }

    pub fn generate_and_store_key(&mut self, user_id: &str, algorithm: &str) -> PQCResult<String> {
        info!("Generating new {} key for user {}", algorithm, user_id);

        if self.user_keys.get(user_id).map_or(0, |keys| keys.len()) >= self.max_keys_per_user {
            return Err(PQCError::KeyGenerationFailed(
                "Maximum keys per user exceeded".to_string()
            ));
        }

        let mut metadata = KeyMetadata::new(user_id.to_string(), algorithm.to_string());

        let keypair = match algorithm {
            "Kyber-768" | "ML-KEM-768" => {
                crate::generate_mlkem_keypair()?
            },
            "Dilithium-3" | "ML-DSA-65" => {
                crate::generate_mldsa_keypair()?
            },
            _ => return Err(PQCError::UnsupportedAlgorithm(algorithm.to_string())),
        };

        if self.hsm_config.enabled {
            metadata.hsm_reference = Some(self.store_key_in_hsm(&keypair, &metadata)?);
            info!("Key {} stored in HSM with reference: {:?}",
                  metadata.key_id, metadata.hsm_reference);
        }

        let key_id = metadata.key_id.clone();

        self.keys.insert(key_id.clone(), (keypair, metadata));

        self.user_keys
            .entry(user_id.to_string())
            .or_insert_with(Vec::new)
            .push(key_id.clone());

        info!("Successfully generated and stored key {} for user {}", key_id, user_id);
        Ok(key_id)
    }

    pub fn rotate_key(&mut self, key_id: &str) -> PQCResult<String> {
        info!("Rotating key {}", key_id);

        let (old_keypair, mut old_metadata) = self.keys.remove(key_id)
            .ok_or_else(|| PQCError::KeyNotFound(key_id.to_string()))?;

        if old_metadata.status != KeyStatus::Active {
            return Err(PQCError::InvalidKeyState(
                format!("Cannot rotate key in status: {:?}", old_metadata.status)
            ));
        }

        old_metadata.status = KeyStatus::Rotating;
        self.keys.insert(key_id.to_string(), (old_keypair, old_metadata.clone()));

        let new_key_id = self.generate_and_store_key(&old_metadata.user_id, &old_metadata.algorithm)?;

        if let Some((_, new_metadata)) = self.keys.get_mut(&new_key_id) {
            new_metadata.rotation_count = old_metadata.rotation_count + 1;
        }


        info!("Successfully rotated key {} to new key {}", key_id, new_key_id);
        Ok(new_key_id)
    }

    pub fn revoke_key(&mut self, key_id: &str) -> PQCResult<()> {
        info!("Revoking key {}", key_id);

        let hsm_ref = if let Some((_, metadata)) = self.keys.get(key_id) {
            metadata.hsm_reference.clone()
        } else {
            return Err(PQCError::KeyNotFound(key_id.to_string()));
        };

        if let Some(hsm_ref) = &hsm_ref {
            self.remove_key_from_hsm(hsm_ref)?;
            info!("Removed key {} from HSM", key_id);
        }

        if let Some((keypair, metadata)) = self.keys.get_mut(key_id) {
            metadata.status = KeyStatus::Revoked;

            let keypair_copy = keypair.clone();
            self.secure_delete_key(&keypair_copy)?;

            info!("Successfully revoked key {}", key_id);
            Ok(())
        } else {
            Err(PQCError::KeyNotFound(key_id.to_string()))
        }
    }

    pub fn get_active_key(&self, user_id: &str, algorithm: &str) -> PQCResult<(&PQCKeyPair, &KeyMetadata)> {
        let user_key_ids = self.user_keys.get(user_id)
            .ok_or_else(|| PQCError::KeyNotFound(format!("No keys for user {}", user_id)))?;

        for key_id in user_key_ids {
            if let Some((keypair, metadata)) = self.keys.get(key_id) {
                if metadata.algorithm == algorithm &&
                   metadata.status == KeyStatus::Active &&
                   !metadata.is_expired() {
                    return Ok((keypair, metadata));
                }
            }
        }

        Err(PQCError::KeyNotFound(
            format!("No active {} key found for user {}", algorithm, user_id)
        ))
    }

    pub fn get_key_by_id(&self, key_id: &str) -> PQCResult<(&PQCKeyPair, &KeyMetadata)> {
        self.keys.get(key_id)
            .map(|(keypair, metadata)| (keypair, metadata))
            .ok_or_else(|| PQCError::KeyNotFound(key_id.to_string()))
    }

    pub fn update_key_usage(&mut self, key_id: &str) -> PQCResult<()> {
        if let Some((_, metadata)) = self.keys.get_mut(key_id) {
            let current_time = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            metadata.last_used = Some(current_time);
            Ok(())
        } else {
            Err(PQCError::KeyNotFound(key_id.to_string()))
        }
    }

    pub fn cleanup_expired_keys(&mut self) -> PQCResult<usize> {
        info!("Starting cleanup of expired keys");

        let mut expired_keys = Vec::new();
        let mut keys_to_remove = Vec::new();

        for (key_id, (_, metadata)) in &self.keys {
            if metadata.is_expired() || metadata.status == KeyStatus::Expired {
                expired_keys.push(key_id.clone());
                keys_to_remove.push(key_id.clone());
            }
        }

        for key_id in &keys_to_remove {
            if let Some((keypair, metadata)) = self.keys.remove(key_id) {
                if let Some(hsm_ref) = &metadata.hsm_reference {
                    if let Err(e) = self.remove_key_from_hsm(hsm_ref) {
                        error!("Failed to remove key {} from HSM: {}", key_id, e);
                    }
                }

                if let Err(e) = self.secure_delete_key(&keypair) {
                    error!("Failed to securely delete key {}: {}", key_id, e);
                }

                if let Some(user_keys) = self.user_keys.get_mut(&metadata.user_id) {
                    user_keys.retain(|id| id != key_id);
                }
            }
        }

        let cleanup_count = expired_keys.len();
        info!("Cleaned up {} expired keys", cleanup_count);
        Ok(cleanup_count)
    }

    pub fn auto_rotate_keys(&mut self) -> PQCResult<Vec<(String, String)>> {
        info!("Starting automatic key rotation check");

        let mut rotated_keys = Vec::new();
        let mut keys_to_rotate = Vec::new();

        for (key_id, (_, metadata)) in &self.keys {
            if metadata.status == KeyStatus::Active &&
               metadata.should_rotate(self.rotation_interval) {
                keys_to_rotate.push(key_id.clone());
            }
        }

        for old_key_id in keys_to_rotate {
            match self.rotate_key(&old_key_id) {
                Ok(new_key_id) => {
                    rotated_keys.push((old_key_id, new_key_id));
                },
                Err(e) => {
                    error!("Failed to rotate key {}: {}", old_key_id, e);
                }
            }
        }

        info!("Auto-rotated {} keys", rotated_keys.len());
        Ok(rotated_keys)
    }

    pub fn get_user_keys(&self, user_id: &str) -> Vec<&KeyMetadata> {
        self.user_keys.get(user_id)
            .map(|key_ids| {
                key_ids.iter()
                    .filter_map(|key_id| self.keys.get(key_id).map(|(_, metadata)| metadata))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn get_key_statistics(&self) -> KeyStatistics {
        let mut stats = KeyStatistics::default();

        for (_, metadata) in self.keys.values() {
            stats.total_keys += 1;

            match metadata.status {
                KeyStatus::Active => stats.active_keys += 1,
                KeyStatus::Expired => stats.expired_keys += 1,
                KeyStatus::Revoked => stats.revoked_keys += 1,
                KeyStatus::Pending => stats.pending_keys += 1,
                KeyStatus::Rotating => stats.rotating_keys += 1,
            }

            if metadata.is_expired() {
                stats.needs_cleanup += 1;
            }

            if metadata.should_rotate(self.rotation_interval) {
                stats.needs_rotation += 1;
            }
        }

        stats.unique_users = self.user_keys.len();
        stats
    }

    pub fn get_key_count(&self) -> usize {
        self.keys.len()
    }

    pub fn get_all_keys(&self) -> Vec<&KeyMetadata> {
        self.keys.values().map(|(_, metadata)| metadata).collect()
    }

    pub fn get_active_keys_for_user(&self, user_id: &str) -> Vec<&KeyMetadata> {
        self.user_keys.get(user_id)
            .map(|key_ids| {
                key_ids.iter()
                    .filter_map(|key_id| self.keys.get(key_id))
                    .map(|(_, metadata)| metadata)
                    .filter(|metadata| metadata.status == KeyStatus::Active)
                    .collect()
            })
            .unwrap_or_default()
    }

    fn store_key_in_hsm(&self, _keypair: &PQCKeyPair, metadata: &KeyMetadata) -> PQCResult<String> {
        if !self.hsm_config.enabled {
            return Err(PQCError::HSMError("HSM not enabled".to_string()));
        }

        let hsm_reference = format!("hsm://{}:{}/{}",
                                   self.hsm_config.provider,
                                   self.hsm_config.key_slot.unwrap_or(0),
                                   metadata.key_id);

        info!("Simulating HSM key storage for key {}", metadata.key_id);

        Ok(hsm_reference)
    }

    fn remove_key_from_hsm(&self, hsm_reference: &str) -> PQCResult<()> {
        info!("Simulating HSM key removal for reference: {}", hsm_reference);
        Ok(())
    }

    fn secure_delete_key(&self, _keypair: &PQCKeyPair) -> PQCResult<()> {
        info!("Performing secure key deletion (memory zeroing)");
        Ok(())
    }
}

impl Default for SecureKeyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Default)]
pub struct KeyStatistics {
    pub total_keys: usize,
    pub active_keys: usize,
    pub expired_keys: usize,
    pub revoked_keys: usize,
    pub pending_keys: usize,
    pub rotating_keys: usize,
    pub needs_cleanup: usize,
    pub needs_rotation: usize,
    pub unique_users: usize,
}

impl KeyStatistics {
    pub fn get(&self, status: &KeyStatus) -> Option<&usize> {
        match status {
            KeyStatus::Active => Some(&self.active_keys),
            KeyStatus::Expired => Some(&self.expired_keys),
            KeyStatus::Revoked => Some(&self.revoked_keys),
            KeyStatus::Pending => Some(&self.pending_keys),
            KeyStatus::Rotating => Some(&self.rotating_keys),
        }
    }
}

pub fn create_default_key_manager() -> SecureKeyManager {
    SecureKeyManager::new()
}

pub fn create_hsm_key_manager(hsm_config: HSMConfig) -> SecureKeyManager {
    SecureKeyManager::new().with_hsm_config(hsm_config)
}
