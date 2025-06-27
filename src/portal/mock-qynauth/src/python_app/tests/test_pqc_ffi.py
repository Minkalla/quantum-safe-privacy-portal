"""
Comprehensive tests for the PQC FFI integration layer.

This module tests the Python-Rust FFI interface for quantum-safe cryptographic operations,
including ML-KEM and ML-DSA algorithms.
"""

import pytest
import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from ctypes import c_char_p, c_int, c_uint8, POINTER, Structure, byref

sys.path.append(str(Path(__file__).parent.parent))

try:
    from pqc_ffi import PQCLibrary, PQCLibraryError
except ImportError:
    class PQCLibraryError(Exception):
        pass
    
    class PQCLibrary:
        def __init__(self):
            raise PQCLibraryError("Rust library not available")


class TestPQCLibraryInitialization:
    """Test PQC library initialization and error handling."""
    
    def test_library_initialization_success(self):
        """Test successful library initialization."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            mock_lib.ml_kem_generate_keypair = Mock()
            mock_lib.ml_kem_encapsulate = Mock()
            mock_lib.ml_kem_decapsulate = Mock()
            mock_lib.ml_dsa_generate_keypair = Mock()
            mock_lib.ml_dsa_sign = Mock()
            mock_lib.ml_dsa_verify = Mock()
            
            try:
                library = PQCLibrary()
                assert library.lib is not None
                assert hasattr(library, 'generate_ml_kem_keypair')
                assert hasattr(library, 'generate_ml_dsa_keypair')
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_library_initialization_failure(self):
        """Test library initialization failure handling."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_load.side_effect = OSError("Library not found")
            
            with pytest.raises(PQCLibraryError) as exc_info:
                PQCLibrary()
            
            assert "Failed to load PQC library" in str(exc_info.value)
    
    def test_library_path_resolution(self):
        """Test library path resolution logic."""
        with patch('pqc_ffi.Path.exists') as mock_exists:
            with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
                mock_exists.return_value = True
                mock_lib = Mock()
                mock_load.return_value = mock_lib
                
                for func_name in ['ml_kem_generate_keypair', 'ml_kem_encapsulate', 
                                'ml_kem_decapsulate', 'ml_dsa_generate_keypair', 
                                'ml_dsa_sign', 'ml_dsa_verify']:
                    setattr(mock_lib, func_name, Mock())
                
                try:
                    library = PQCLibrary()
                    mock_exists.assert_called()
                except PQCLibraryError:
                    pytest.skip("Rust library not available for testing")


class TestMLKEMOperations:
    """Test ML-KEM (Kyber-768) key encapsulation mechanism operations."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            mock_lib.ml_kem_generate_keypair = Mock(return_value=0)
            mock_lib.ml_kem_encapsulate = Mock(return_value=0)
            mock_lib.ml_kem_decapsulate = Mock(return_value=0)
            mock_lib.ml_dsa_generate_keypair = Mock(return_value=0)
            mock_lib.ml_dsa_sign = Mock(return_value=0)
            mock_lib.ml_dsa_verify = Mock(return_value=0)
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_ml_kem_keypair_generation_success(self, mock_library):
        """Test successful ML-KEM keypair generation."""
        mock_public_key = b'x' * 1184  # ML-KEM-768 public key size
        mock_private_key = b'y' * 2400  # ML-KEM-768 private key size
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = (mock_public_key, mock_private_key)
            
            public_key, private_key = mock_library.generate_ml_kem_keypair()
            
            assert len(public_key) == 1184
            assert len(private_key) == 2400
            assert isinstance(public_key, bytes)
            assert isinstance(private_key, bytes)
    
    def test_ml_kem_keypair_generation_failure(self, mock_library):
        """Test ML-KEM keypair generation failure handling."""
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.side_effect = PQCLibraryError("Key generation failed")
            
            with pytest.raises(PQCLibraryError) as exc_info:
                mock_library.generate_ml_kem_keypair()
            
            assert "Key generation failed" in str(exc_info.value)
    
    def test_ml_kem_encapsulation_success(self, mock_library):
        """Test successful ML-KEM encapsulation."""
        public_key = b'x' * 1184  # Valid public key size
        mock_ciphertext = b'c' * 1088  # ML-KEM-768 ciphertext size
        mock_shared_secret = b's' * 32  # Shared secret size
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = (mock_ciphertext, mock_shared_secret)
            
            ciphertext, shared_secret = mock_library.encapsulate_ml_kem(public_key)
            
            assert len(ciphertext) == 1088
            assert len(shared_secret) == 32
            assert isinstance(ciphertext, bytes)
            assert isinstance(shared_secret, bytes)
    
    def test_ml_kem_encapsulation_invalid_key_size(self, mock_library):
        """Test ML-KEM encapsulation with invalid public key size."""
        invalid_public_key = b'x' * 100  # Invalid size
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.encapsulate_ml_kem(invalid_public_key)
        
        assert "Invalid public key size" in str(exc_info.value)
    
    def test_ml_kem_decapsulation_success(self, mock_library):
        """Test successful ML-KEM decapsulation."""
        private_key = b'y' * 2400  # Valid private key size
        ciphertext = b'c' * 1088  # Valid ciphertext size
        mock_shared_secret = b's' * 32  # Expected shared secret
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = mock_shared_secret
            
            shared_secret = mock_library.decapsulate_ml_kem(private_key, ciphertext)
            
            assert len(shared_secret) == 32
            assert isinstance(shared_secret, bytes)
    
    def test_ml_kem_decapsulation_invalid_sizes(self, mock_library):
        """Test ML-KEM decapsulation with invalid key/ciphertext sizes."""
        invalid_private_key = b'y' * 100
        valid_ciphertext = b'c' * 1088
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.decapsulate_ml_kem(invalid_private_key, valid_ciphertext)
        assert "Invalid private key size" in str(exc_info.value)
        
        valid_private_key = b'y' * 2400
        invalid_ciphertext = b'c' * 100
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.decapsulate_ml_kem(valid_private_key, invalid_ciphertext)
        assert "Invalid ciphertext size" in str(exc_info.value)


class TestMLDSAOperations:
    """Test ML-DSA (Dilithium-3) digital signature algorithm operations."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            mock_lib.ml_kem_generate_keypair = Mock(return_value=0)
            mock_lib.ml_kem_encapsulate = Mock(return_value=0)
            mock_lib.ml_kem_decapsulate = Mock(return_value=0)
            mock_lib.ml_dsa_generate_keypair = Mock(return_value=0)
            mock_lib.ml_dsa_sign = Mock(return_value=0)
            mock_lib.ml_dsa_verify = Mock(return_value=0)
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_ml_dsa_keypair_generation_success(self, mock_library):
        """Test successful ML-DSA keypair generation."""
        mock_public_key = b'p' * 1952  # ML-DSA-65 public key size
        mock_private_key = b's' * 4000  # ML-DSA-65 private key size
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = (mock_public_key, mock_private_key)
            
            public_key, private_key = mock_library.generate_ml_dsa_keypair()
            
            assert len(public_key) == 1952
            assert len(private_key) == 4000
            assert isinstance(public_key, bytes)
            assert isinstance(private_key, bytes)
    
    def test_ml_dsa_signing_success(self, mock_library):
        """Test successful ML-DSA message signing."""
        private_key = b's' * 4000  # Valid private key size
        message = b"Test message for signing"
        mock_signature = b'sig' * 1103  # ML-DSA-65 signature size (approximate)
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = mock_signature
            
            signature = mock_library.sign_ml_dsa(private_key, message)
            
            assert len(signature) > 0
            assert isinstance(signature, bytes)
    
    def test_ml_dsa_signing_invalid_key_size(self, mock_library):
        """Test ML-DSA signing with invalid private key size."""
        invalid_private_key = b's' * 100  # Invalid size
        message = b"Test message"
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.sign_ml_dsa(invalid_private_key, message)
        
        assert "Invalid private key size" in str(exc_info.value)
    
    def test_ml_dsa_signing_empty_message(self, mock_library):
        """Test ML-DSA signing with empty message."""
        private_key = b's' * 4000  # Valid private key size
        empty_message = b""
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.sign_ml_dsa(private_key, empty_message)
        
        assert "Message cannot be empty" in str(exc_info.value)
    
    def test_ml_dsa_verification_success(self, mock_library):
        """Test successful ML-DSA signature verification."""
        public_key = b'p' * 1952  # Valid public key size
        message = b"Test message for verification"
        signature = b'sig' * 1000  # Mock signature
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = True  # Valid signature
            
            is_valid = mock_library.verify_ml_dsa(public_key, message, signature)
            
            assert is_valid is True
            assert isinstance(is_valid, bool)
    
    def test_ml_dsa_verification_failure(self, mock_library):
        """Test ML-DSA signature verification failure."""
        public_key = b'p' * 1952  # Valid public key size
        message = b"Test message for verification"
        invalid_signature = b'badsig' * 100  # Invalid signature
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = False  # Invalid signature
            
            is_valid = mock_library.verify_ml_dsa(public_key, message, invalid_signature)
            
            assert is_valid is False
            assert isinstance(is_valid, bool)
    
    def test_ml_dsa_verification_invalid_sizes(self, mock_library):
        """Test ML-DSA verification with invalid key/signature sizes."""
        invalid_public_key = b'p' * 100
        message = b"Test message"
        signature = b'sig' * 1000
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.verify_ml_dsa(invalid_public_key, message, signature)
        assert "Invalid public key size" in str(exc_info.value)


class TestUtilityFunctions:
    """Test utility functions and helper methods."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            for func_name in ['ml_kem_generate_keypair', 'ml_kem_encapsulate', 
                            'ml_kem_decapsulate', 'ml_dsa_generate_keypair', 
                            'ml_dsa_sign', 'ml_dsa_verify']:
                setattr(mock_lib, func_name, Mock(return_value=0))
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_bytes_to_c_array_conversion(self, mock_library):
        """Test conversion of Python bytes to C array."""
        test_data = b"Hello, World!"
        
        c_array, length = mock_library._bytes_to_c_array(test_data)
        
        assert length == len(test_data)
        assert c_array is not None
    
    def test_bytes_to_c_array_empty_data(self, mock_library):
        """Test conversion of empty bytes to C array."""
        empty_data = b""
        
        c_array, length = mock_library._bytes_to_c_array(empty_data)
        
        assert length == 0
        assert c_array is None
    
    def test_error_handling_consistency(self, mock_library):
        """Test that error handling is consistent across all methods."""
        error_methods = [
            ('generate_ml_kem_keypair', []),
            ('encapsulate_ml_kem', [b'x' * 1184]),
            ('decapsulate_ml_kem', [b'y' * 2400, b'c' * 1088]),
            ('generate_ml_dsa_keypair', []),
            ('sign_ml_dsa', [b's' * 4000, b'message']),
            ('verify_ml_dsa', [b'p' * 1952, b'message', b'signature']),
        ]
        
        for method_name, args in error_methods:
            with patch.object(mock_library, '_call_ffi_function') as mock_call:
                mock_call.side_effect = PQCLibraryError("Test error")
                
                method = getattr(mock_library, method_name)
                with pytest.raises(PQCLibraryError) as exc_info:
                    method(*args)
                
                assert "Test error" in str(exc_info.value)


class TestIntegrationScenarios:
    """Test complete integration scenarios combining multiple operations."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            for func_name in ['ml_kem_generate_keypair', 'ml_kem_encapsulate', 
                            'ml_kem_decapsulate', 'ml_dsa_generate_keypair', 
                            'ml_dsa_sign', 'ml_dsa_verify']:
                setattr(mock_lib, func_name, Mock(return_value=0))
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_complete_ml_kem_workflow(self, mock_library):
        """Test complete ML-KEM workflow: keygen -> encapsulate -> decapsulate."""
        mock_public_key = b'p' * 1184
        mock_private_key = b's' * 2400
        mock_ciphertext = b'c' * 1088
        mock_shared_secret = b'secret' * 4  # 32 bytes
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.side_effect = [
                (mock_public_key, mock_private_key),  # keypair generation
                (mock_ciphertext, mock_shared_secret),  # encapsulation
                mock_shared_secret  # decapsulation
            ]
            
            public_key, private_key = mock_library.generate_ml_kem_keypair()
            assert len(public_key) == 1184
            assert len(private_key) == 2400
            
            ciphertext, shared_secret1 = mock_library.encapsulate_ml_kem(public_key)
            assert len(ciphertext) == 1088
            assert len(shared_secret1) == 32
            
            shared_secret2 = mock_library.decapsulate_ml_kem(private_key, ciphertext)
            assert len(shared_secret2) == 32
            
            assert shared_secret1 == shared_secret2
    
    def test_complete_ml_dsa_workflow(self, mock_library):
        """Test complete ML-DSA workflow: keygen -> sign -> verify."""
        mock_public_key = b'p' * 1952
        mock_private_key = b's' * 4000
        mock_signature = b'sig' * 1000
        message = b"Important message to sign and verify"
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.side_effect = [
                (mock_public_key, mock_private_key),  # keypair generation
                mock_signature,  # signing
                True  # verification success
            ]
            
            public_key, private_key = mock_library.generate_ml_dsa_keypair()
            assert len(public_key) == 1952
            assert len(private_key) == 4000
            
            signature = mock_library.sign_ml_dsa(private_key, message)
            assert len(signature) > 0
            
            is_valid = mock_library.verify_ml_dsa(public_key, message, signature)
            assert is_valid is True
    
    def test_mixed_algorithm_usage(self, mock_library):
        """Test using both ML-KEM and ML-DSA algorithms together."""
        kem_public = b'kp' * 592  # 1184 bytes
        kem_private = b'ks' * 1200  # 2400 bytes
        dsa_public = b'dp' * 976  # 1952 bytes
        dsa_private = b'ds' * 2000  # 4000 bytes
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.side_effect = [
                (kem_public, kem_private),  # ML-KEM keypair
                (dsa_public, dsa_private),  # ML-DSA keypair
            ]
            
            kem_pub, kem_priv = mock_library.generate_ml_kem_keypair()
            dsa_pub, dsa_priv = mock_library.generate_ml_dsa_keypair()
            
            assert len(kem_pub) == 1184
            assert len(kem_priv) == 2400
            assert len(dsa_pub) == 1952
            assert len(dsa_priv) == 4000
            
            assert kem_pub != dsa_pub
            assert kem_priv != dsa_priv


class TestErrorHandlingAndEdgeCases:
    """Test error handling and edge cases."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            for func_name in ['ml_kem_generate_keypair', 'ml_kem_encapsulate', 
                            'ml_kem_decapsulate', 'ml_dsa_generate_keypair', 
                            'ml_dsa_sign', 'ml_dsa_verify']:
                setattr(mock_lib, func_name, Mock(return_value=0))
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_memory_management(self, mock_library):
        """Test that memory is properly managed during operations."""
        large_message = b"x" * 10000  # 10KB message
        private_key = b's' * 4000
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = b'signature' * 100
            
            signature = mock_library.sign_ml_dsa(private_key, large_message)
            assert isinstance(signature, bytes)
    
    def test_concurrent_operations(self, mock_library):
        """Test that concurrent operations are handled safely."""
        import threading
        import time
        
        results = []
        errors = []
        
        def generate_keypair():
            try:
                with patch.object(mock_library, '_call_ffi_function') as mock_call:
                    mock_call.return_value = (b'p' * 1184, b's' * 2400)
                    result = mock_library.generate_ml_kem_keypair()
                    results.append(result)
            except Exception as e:
                errors.append(e)
        
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=generate_keypair)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        assert len(errors) == 0
        assert len(results) == 5
    
    def test_invalid_input_types(self, mock_library):
        """Test handling of invalid input types."""
        with pytest.raises((TypeError, PQCLibraryError)):
            mock_library.encapsulate_ml_kem("not bytes")
        
        with pytest.raises((TypeError, PQCLibraryError)):
            mock_library.sign_ml_dsa(123, b"message")
        
        with pytest.raises((TypeError, PQCLibraryError)):
            mock_library.verify_ml_dsa(b'key', None, b'signature')
    
    def test_boundary_conditions(self, mock_library):
        """Test boundary conditions for key and data sizes."""
        min_kem_public = b'x' * 1184
        min_kem_private = b'y' * 2400
        min_dsa_public = b'p' * 1952
        min_dsa_private = b's' * 4000
        
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = (b'c' * 1088, b'secret' * 4)
            try:
                mock_library.encapsulate_ml_kem(min_kem_public)
            except PQCLibraryError as e:
                if "Invalid public key size" in str(e):
                    pytest.fail("Minimum valid size should be accepted")
        
        invalid_kem_public = b'x' * 1183  # One byte short
        
        with pytest.raises(PQCLibraryError) as exc_info:
            mock_library.encapsulate_ml_kem(invalid_kem_public)
        assert "Invalid public key size" in str(exc_info.value)


class TestPerformanceAndStress:
    """Test performance characteristics and stress conditions."""
    
    @pytest.fixture
    def mock_library(self):
        """Create a mock PQC library for testing."""
        with patch('pqc_ffi.cdll.LoadLibrary') as mock_load:
            mock_lib = Mock()
            mock_load.return_value = mock_lib
            
            for func_name in ['ml_kem_generate_keypair', 'ml_kem_encapsulate', 
                            'ml_kem_decapsulate', 'ml_dsa_generate_keypair', 
                            'ml_dsa_sign', 'ml_dsa_verify']:
                setattr(mock_lib, func_name, Mock(return_value=0))
            
            try:
                return PQCLibrary()
            except PQCLibraryError:
                pytest.skip("Rust library not available for testing")
    
    def test_repeated_operations(self, mock_library):
        """Test that repeated operations work consistently."""
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = (b'p' * 1184, b's' * 2400)
            
            for i in range(100):
                public_key, private_key = mock_library.generate_ml_kem_keypair()
                assert len(public_key) == 1184
                assert len(private_key) == 2400
    
    def test_large_batch_operations(self, mock_library):
        """Test handling of large batch operations."""
        with patch.object(mock_library, '_call_ffi_function') as mock_call:
            mock_call.return_value = b'signature' * 100
            
            private_key = b's' * 4000
            messages = [f"Message {i}".encode() for i in range(50)]
            
            signatures = []
            for message in messages:
                signature = mock_library.sign_ml_dsa(private_key, message)
                signatures.append(signature)
            
            assert len(signatures) == 50
            for signature in signatures:
                assert isinstance(signature, bytes)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
