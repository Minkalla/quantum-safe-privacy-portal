"""
Unit Tests for Enhanced Kyber Bindings

This module tests the enhanced Kyber ML-KEM-768 implementation with
comprehensive error handling and performance monitoring.
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch

sys.path.append(os.path.join(os.path.dirname(__file__), '../../../src/python_app'))

from pqc_bindings.kyber import KyberKeyPair
from pqc_bindings.exceptions import KyberError, KeyGenerationError, EncapsulationError, DecapsulationError
from pqc_bindings.utils import validate_key_size, validate_message

@pytest.mark.unit
class TestKyberBindings:
    """Unit tests for enhanced Kyber Python bindings."""
    
    def test_keypair_generation_success(self, mock_pqc_library):
        """Test successful Kyber keypair generation."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            assert keypair is not None
            assert keypair.lib == mock_pqc_library
            assert keypair.algorithm == "ML-KEM-768"
            assert keypair.key_size == 1184
    
    def test_keypair_generation_with_performance_monitoring(self, mock_pqc_library):
        """Test Kyber keypair generation with performance monitoring."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.kyber.performance_monitor') as mock_monitor:
                mock_context = Mock()
                mock_monitor.monitor_operation.return_value.__enter__ = Mock(return_value=mock_context)
                mock_monitor.monitor_operation.return_value.__exit__ = Mock(return_value=None)
                
                keypair = KyberKeyPair(mock_pqc_library)
                
                mock_monitor.monitor_operation.assert_called_with(
                    "key_generation", 
                    "system", 
                    "ML-KEM-768",
                    {"key_size": 1184}
                )
    
    def test_encapsulation_success(self, mock_pqc_library, test_user_id):
        """Test successful Kyber encapsulation."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            shared_secret, ciphertext = keypair.encapsulate(test_user_id)
            
            assert len(shared_secret) > 0
            assert len(ciphertext) > 0
            assert isinstance(shared_secret, bytes)
            assert isinstance(ciphertext, bytes)
    
    def test_decapsulation_success(self, mock_pqc_library, test_user_id):
        """Test successful Kyber decapsulation."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            shared_secret1, ciphertext = keypair.encapsulate(test_user_id)
            
            shared_secret2 = keypair.decapsulate(ciphertext, test_user_id)
            
            assert shared_secret1 == shared_secret2
    
    def test_encapsulation_with_invalid_user_id(self, mock_pqc_library):
        """Test encapsulation with invalid user ID."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            with pytest.raises(ValueError, match="User ID cannot be empty"):
                keypair.encapsulate("")
    
    def test_decapsulation_with_invalid_ciphertext(self, mock_pqc_library, test_user_id):
        """Test decapsulation with invalid ciphertext."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            with pytest.raises(DecapsulationError):
                keypair.decapsulate(b"invalid_ciphertext", test_user_id)
    
    def test_encapsulation_with_metadata(self, mock_pqc_library, test_user_id, test_metadata):
        """Test encapsulation with metadata."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            shared_secret, ciphertext = keypair.encapsulate(test_user_id, test_metadata)
            
            assert len(shared_secret) > 0
            assert len(ciphertext) > 0
    
    def test_get_public_key_info(self, mock_pqc_library):
        """Test getting public key information."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            info = keypair.get_public_key_info()
            
            assert info["algorithm"] == "ML-KEM-768"
            assert info["key_size"] == 1184
            assert "created_at" in info
            assert "key_id" in info
    
    def test_validate_ciphertext_size(self, mock_pqc_library):
        """Test ciphertext size validation."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            valid_ciphertext = b"x" * 1088  # Expected ML-KEM-768 ciphertext size
            assert keypair._validate_ciphertext_size(valid_ciphertext) == True
            
            invalid_ciphertext = b"x" * 100
            assert keypair._validate_ciphertext_size(invalid_ciphertext) == False
    
    def test_secure_memory_cleanup(self, mock_pqc_library):
        """Test secure memory cleanup on deletion."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.kyber.secure_zero_memory') as mock_cleanup:
                keypair = KyberKeyPair(mock_pqc_library)
                
                del keypair
                
                assert mock_cleanup.call_count >= 2  # For public and private keys
    
    @pytest.mark.slow
    def test_multiple_operations_performance(self, mock_pqc_library, test_user_id):
        """Test performance with multiple operations."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            for i in range(5):
                shared_secret1, ciphertext = keypair.encapsulate(f"{test_user_id}_{i}")
                shared_secret2 = keypair.decapsulate(ciphertext, f"{test_user_id}_{i}")
                assert shared_secret1 == shared_secret2
    
    def test_error_handling_with_ffi_failure(self, mock_pqc_library, test_user_id):
        """Test error handling when FFI operations fail."""
        mock_pqc_library.encapsulate.side_effect = Exception("FFI operation failed")
        
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            with pytest.raises(EncapsulationError, match="Encapsulation failed"):
                keypair.encapsulate(test_user_id)
    
    def test_algorithm_compliance_metadata(self, mock_pqc_library):
        """Test algorithm compliance metadata."""
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            compliance = keypair.get_compliance_info()
            
            assert compliance["algorithm"] == "ML-KEM-768"
            assert compliance["nist_level"] == 1
            assert compliance["security_strength"] == 128
            assert "NIST SP 800-56C" in compliance["standards"]
