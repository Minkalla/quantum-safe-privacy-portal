"""
Unit Tests for Enhanced Dilithium Bindings

This module tests the enhanced Dilithium ML-DSA-65 implementation with
comprehensive error handling and performance monitoring.
"""

import pytest
import sys
import os
from unittest.mock import Mock, patch

sys.path.append(os.path.join(os.path.dirname(__file__), '../../../src/python_app'))

from pqc_bindings.dilithium import DilithiumKeyPair
from pqc_bindings.exceptions import DilithiumError, KeyGenerationError, SignatureError, VerificationError
from pqc_bindings.utils import validate_message

@pytest.mark.unit
class TestDilithiumBindings:
    """Unit tests for enhanced Dilithium Python bindings."""
    
    def test_keypair_generation_success(self, mock_pqc_library):
        """Test successful Dilithium keypair generation."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            assert keypair is not None
            assert keypair.lib == mock_pqc_library
            assert keypair.algorithm == "ML-DSA-65"
            assert keypair.signature_size == 3309
    
    def test_sign_message_success(self, mock_pqc_library, test_user_id, test_message):
        """Test successful message signing."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            signature = keypair.sign(test_message, test_user_id)
            
            assert len(signature) > 0
            assert isinstance(signature, bytes)
    
    def test_verify_signature_success(self, mock_pqc_library, test_user_id, test_message):
        """Test successful signature verification."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            signature = keypair.sign(test_message, test_user_id)
            
            is_valid = keypair.verify(test_message, signature, test_user_id)
            
            assert is_valid == True
    
    def test_sign_with_invalid_message(self, mock_pqc_library, test_user_id):
        """Test signing with invalid message."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            with pytest.raises(ValueError, match="Message cannot be empty"):
                keypair.sign(b"", test_user_id)
    
    def test_verify_with_invalid_signature(self, mock_pqc_library, test_user_id, test_message):
        """Test verification with invalid signature."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            mock_pqc_library.verify.return_value = False
            
            is_valid = keypair.verify(test_message, b"invalid_signature", test_user_id)
            
            assert is_valid == False
    
    def test_sign_with_metadata(self, mock_pqc_library, test_user_id, test_message, test_metadata):
        """Test signing with metadata."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            signature = keypair.sign(test_message, test_user_id, test_metadata)
            
            assert len(signature) > 0
            assert isinstance(signature, bytes)
    
    def test_get_public_key_info(self, mock_pqc_library):
        """Test getting public key information."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            info = keypair.get_public_key_info()
            
            assert info["algorithm"] == "ML-DSA-65"
            assert info["signature_size"] == 3309
            assert "created_at" in info
            assert "key_id" in info
    
    def test_validate_signature_size(self, mock_pqc_library):
        """Test signature size validation."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            valid_signature = b"x" * 3309  # Expected ML-DSA-65 signature size
            assert keypair._validate_signature_size(valid_signature) == True
            
            invalid_signature = b"x" * 100
            assert keypair._validate_signature_size(invalid_signature) == False
    
    def test_sign_with_performance_monitoring(self, mock_pqc_library, test_user_id, test_message):
        """Test signing with performance monitoring."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.dilithium.performance_monitor') as mock_monitor:
                mock_context = Mock()
                mock_monitor.monitor_operation.return_value.__enter__ = Mock(return_value=mock_context)
                mock_monitor.monitor_operation.return_value.__exit__ = Mock(return_value=None)
                
                keypair = DilithiumKeyPair(mock_pqc_library)
                signature = keypair.sign(test_message, test_user_id)
                
                mock_monitor.monitor_operation.assert_called()
    
    def test_verify_with_performance_monitoring(self, mock_pqc_library, test_user_id, test_message):
        """Test verification with performance monitoring."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.dilithium.performance_monitor') as mock_monitor:
                mock_context = Mock()
                mock_monitor.monitor_operation.return_value.__enter__ = Mock(return_value=mock_context)
                mock_monitor.monitor_operation.return_value.__exit__ = Mock(return_value=None)
                
                keypair = DilithiumKeyPair(mock_pqc_library)
                signature = keypair.sign(test_message, test_user_id)
                is_valid = keypair.verify(test_message, signature, test_user_id)
                
                assert mock_monitor.monitor_operation.call_count >= 2
    
    def test_error_handling_with_ffi_failure(self, mock_pqc_library, test_user_id, test_message):
        """Test error handling when FFI operations fail."""
        mock_pqc_library.sign.side_effect = Exception("FFI operation failed")
        
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            with pytest.raises(SignatureError, match="Signature generation failed"):
                keypair.sign(test_message, test_user_id)
    
    def test_secure_memory_cleanup(self, mock_pqc_library):
        """Test secure memory cleanup on deletion."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.dilithium.secure_zero_memory') as mock_cleanup:
                keypair = DilithiumKeyPair(mock_pqc_library)
                
                del keypair
                
                assert mock_cleanup.call_count >= 2  # For public and private keys
    
    @pytest.mark.slow
    def test_multiple_sign_verify_cycles(self, mock_pqc_library, test_user_id):
        """Test multiple sign/verify cycles."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            for i in range(5):
                message = f"Test message {i}".encode()
                signature = keypair.sign(message, f"{test_user_id}_{i}")
                is_valid = keypair.verify(message, signature, f"{test_user_id}_{i}")
                assert is_valid == True
    
    def test_algorithm_compliance_metadata(self, mock_pqc_library):
        """Test algorithm compliance metadata."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            compliance = keypair.get_compliance_info()
            
            assert compliance["algorithm"] == "ML-DSA-65"
            assert compliance["nist_level"] == 3
            assert compliance["security_strength"] == 192
            assert "NIST SP 800-186" in compliance["standards"]
    
    def test_cross_message_verification_failure(self, mock_pqc_library, test_user_id):
        """Test that signatures don't verify for different messages."""
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            message1 = b"First message"
            message2 = b"Second message"
            
            signature1 = keypair.sign(message1, test_user_id)
            
            mock_pqc_library.verify.return_value = False
            
            is_valid = keypair.verify(message2, signature1, test_user_id)
            assert is_valid == False
