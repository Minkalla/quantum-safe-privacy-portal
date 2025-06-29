import pytest
import sys
import time
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "python_app"))

from pqc_bindings.kyber import KyberKeyPair
from pqc_bindings.dilithium import DilithiumKeyPair
from pqc_bindings.exceptions import PQCError, KyberError, DilithiumError
from pqc_bindings.utils import (
    secure_buffer, get_last_error, get_kyber_last_error, get_dilithium_last_error,
    kyber_keypair_context, dilithium_keypair_context, safe_bytes_to_ctypes,
    validate_key_sizes
)

class TestKyberFFI:
    """Test suite for Kyber FFI operations"""
    
    def test_keypair_generation(self):
        """Test Kyber keypair generation"""
        kp = KyberKeyPair()
        assert len(kp.public_key) == 1184, "ML-KEM-768 public key should be 1184 bytes"
        assert len(kp._secret_key) == 2400, "ML-KEM-768 secret key should be 2400 bytes"
        assert kp.public_key != kp._secret_key, "Public and secret keys should be different"
    
    def test_encapsulation_decapsulation(self):
        """Test Kyber encapsulation and decapsulation"""
        kp = KyberKeyPair()
        
        shared_secret, ciphertext = kp.encapsulate()
        assert len(shared_secret) == 32, "Shared secret should be 32 bytes"
        assert len(ciphertext) == 1088, "ML-KEM-768 ciphertext should be 1088 bytes"
        
        recovered_secret = kp.decapsulate(ciphertext)
        assert shared_secret == recovered_secret, "Shared secrets should match"
    
    def test_multiple_encapsulations(self):
        """Test multiple encapsulations produce different results"""
        kp = KyberKeyPair()
        
        secret1, ciphertext1 = kp.encapsulate()
        secret2, ciphertext2 = kp.encapsulate()
        
        assert secret1 != secret2, "Different encapsulations should produce different secrets"
        assert ciphertext1 != ciphertext2, "Different encapsulations should produce different ciphertexts"
        
        recovered1 = kp.decapsulate(ciphertext1)
        recovered2 = kp.decapsulate(ciphertext2)
        
        assert secret1 == recovered1, "First secret should match"
        assert secret2 == recovered2, "Second secret should match"
    
    def test_invalid_ciphertext(self):
        """Test decapsulation with invalid ciphertext"""
        kp = KyberKeyPair()
        invalid_ciphertext = b"invalid" * 200  # Wrong size and content
        
        with pytest.raises(KyberError):
            kp.decapsulate(invalid_ciphertext)
    
    def test_memory_cleanup(self):
        """Test memory cleanup and resource management"""
        for _ in range(10):
            kp = KyberKeyPair()
            shared_secret, ciphertext = kp.encapsulate()
            recovered_secret = kp.decapsulate(ciphertext)
            assert shared_secret == recovered_secret
            del kp
    
    def test_context_manager(self):
        """Test Kyber keypair context manager"""
        with kyber_keypair_context() as kp:
            assert len(kp.public_key) == 1184
            shared_secret, ciphertext = kp.encapsulate()
            recovered_secret = kp.decapsulate(ciphertext)
            assert shared_secret == recovered_secret

class TestDilithiumFFI:
    """Test suite for Dilithium FFI operations"""
    
    def test_keypair_generation(self):
        """Test Dilithium keypair generation"""
        dp = DilithiumKeyPair()
        assert len(dp.public_key) == 1952, "ML-DSA-65 public key should be 1952 bytes"
        assert len(dp._secret_key) == 4032, "ML-DSA-65 secret key should be 4032 bytes"
        assert dp.public_key != dp._secret_key, "Public and secret keys should be different"
    
    def test_signing_verification(self):
        """Test Dilithium signing and verification"""
        dp = DilithiumKeyPair()
        message = b"Hello, Quantum-Safe World!"
        
        signature = dp.sign(message)
        assert len(signature) > 0, "Signature should not be empty"
        assert len(signature) <= 4595, "ML-DSA-65 signature should be at most 4595 bytes"
        
        is_valid = dp.verify(message, signature)
        assert is_valid, "Signature should be valid"
    
    def test_signature_verification_failure(self):
        """Test signature verification with wrong message"""
        dp = DilithiumKeyPair()
        message = b"Original message"
        wrong_message = b"Different message"
        
        signature = dp.sign(message)
        is_valid = dp.verify(wrong_message, signature)
        assert not is_valid, "Signature should be invalid for wrong message"
    
    def test_multiple_signatures(self):
        """Test multiple signatures of the same message"""
        dp = DilithiumKeyPair()
        message = b"Test message"
        
        signature1 = dp.sign(message)
        signature2 = dp.sign(message)
        
        assert dp.verify(message, signature1), "First signature should be valid"
        assert dp.verify(message, signature2), "Second signature should be valid"
    
    def test_empty_message_signing(self):
        """Test signing empty message"""
        dp = DilithiumKeyPair()
        empty_message = b""
        
        with pytest.raises(DilithiumError):
            dp.sign(empty_message)
    
    def test_large_message_signing(self):
        """Test signing large message"""
        dp = DilithiumKeyPair()
        large_message = b"A" * 10000  # 10KB message
        
        signature = dp.sign(large_message)
        is_valid = dp.verify(large_message, signature)
        assert is_valid, "Large message signature should be valid"
    
    def test_invalid_signature(self):
        """Test verification with invalid signature"""
        dp = DilithiumKeyPair()
        message = b"Test message"
        invalid_signature = b"invalid" * 100
        
        is_valid = dp.verify(message, invalid_signature)
        assert not is_valid, "Invalid signature should not verify"
    
    def test_memory_cleanup(self):
        """Test memory cleanup and resource management"""
        for _ in range(10):
            dp = DilithiumKeyPair()
            message = b"Test message"
            signature = dp.sign(message)
            is_valid = dp.verify(message, signature)
            assert is_valid
            del dp
    
    def test_context_manager(self):
        """Test Dilithium keypair context manager"""
        with dilithium_keypair_context() as dp:
            assert len(dp.public_key) == 1952
            message = b"Test message"
            signature = dp.sign(message)
            is_valid = dp.verify(message, signature)
            assert is_valid

class TestUtilityFunctions:
    """Test suite for utility functions"""
    
    def test_secure_buffer(self):
        """Test secure buffer context manager"""
        with secure_buffer(32) as buf:
            assert len(buf) == 32
            assert all(b == 0 for b in buf)
    
    def test_secure_buffer_invalid_size(self):
        """Test secure buffer with invalid size"""
        with pytest.raises(ValueError):
            with secure_buffer(0):
                pass
        
        with pytest.raises(ValueError):
            with secure_buffer(-1):
                pass
    
    def test_error_retrieval(self):
        """Test error message retrieval functions"""
        error_msg = get_last_error()
        assert isinstance(error_msg, str)
        
        kyber_error = get_kyber_last_error()
        assert isinstance(kyber_error, str)
        
        dilithium_error = get_dilithium_last_error()
        assert isinstance(dilithium_error, str)
    
    def test_safe_bytes_to_ctypes(self):
        """Test safe bytes to ctypes conversion"""
        test_data = b"Hello, World!"
        ctypes_array = safe_bytes_to_ctypes(test_data)
        assert len(ctypes_array) == len(test_data)
        
        converted_back = bytes(ctypes_array)
        assert converted_back == test_data
    
    def test_safe_bytes_to_ctypes_invalid_input(self):
        """Test safe bytes to ctypes with invalid input"""
        with pytest.raises(TypeError):
            safe_bytes_to_ctypes("not bytes")
        
        with pytest.raises(TypeError):
            safe_bytes_to_ctypes(123)
    
    def test_validate_key_sizes(self):
        """Test key size validation"""
        validation = validate_key_sizes()
        assert validation['success'] is True
        assert validation['kyber_valid'] is True
        assert validation['dilithium_valid'] is True
        assert validation['kyber_public_key_len'] == 1184
        assert validation['dilithium_public_key_len'] == 1952

class TestPerformanceBenchmarks:
    """Performance and stress testing"""
    
    def test_kyber_performance_benchmark(self):
        """Benchmark Kyber operations"""
        iterations = 100
        
        start_time = time.time()
        for _ in range(iterations):
            kp = KyberKeyPair()
            del kp
        keygen_time = time.time() - start_time
        avg_keygen_time = keygen_time / iterations
        
        print(f"Kyber key generation: {avg_keygen_time*1000:.2f}ms average")
        assert avg_keygen_time < 0.1, "Key generation should be under 100ms"
        
        kp = KyberKeyPair()
        start_time = time.time()
        for _ in range(iterations):
            shared_secret, ciphertext = kp.encapsulate()
            recovered_secret = kp.decapsulate(ciphertext)
            assert shared_secret == recovered_secret
        encap_time = time.time() - start_time
        avg_encap_time = encap_time / iterations
        
        print(f"Kyber encap/decap: {avg_encap_time*1000:.2f}ms average")
        assert avg_encap_time < 0.1, "Encap/decap should be under 100ms"
    
    def test_dilithium_performance_benchmark(self):
        """Benchmark Dilithium operations"""
        iterations = 100
        message = b"Performance test message"
        
        start_time = time.time()
        for _ in range(iterations):
            dp = DilithiumKeyPair()
            del dp
        keygen_time = time.time() - start_time
        avg_keygen_time = keygen_time / iterations
        
        print(f"Dilithium key generation: {avg_keygen_time*1000:.2f}ms average")
        assert avg_keygen_time < 0.1, "Key generation should be under 100ms"
        
        dp = DilithiumKeyPair()
        start_time = time.time()
        signatures = []
        for _ in range(iterations):
            signature = dp.sign(message)
            signatures.append(signature)
        signing_time = time.time() - start_time
        avg_signing_time = signing_time / iterations
        
        print(f"Dilithium signing: {avg_signing_time*1000:.2f}ms average")
        assert avg_signing_time < 1.0, "Signing should be under 1000ms"
        
        start_time = time.time()
        for signature in signatures:
            is_valid = dp.verify(message, signature)
            assert is_valid
        verification_time = time.time() - start_time
        avg_verification_time = verification_time / iterations
        
        print(f"Dilithium verification: {avg_verification_time*1000:.2f}ms average")
        assert avg_verification_time < 1.0, "Verification should be under 1000ms"
    
    def test_stress_testing(self):
        """Stress test with high-load scenarios"""
        def kyber_worker():
            for _ in range(50):
                kp = KyberKeyPair()
                shared_secret, ciphertext = kp.encapsulate()
                recovered_secret = kp.decapsulate(ciphertext)
                assert shared_secret == recovered_secret
        
        def dilithium_worker():
            for _ in range(50):
                dp = DilithiumKeyPair()
                message = b"Stress test message"
                signature = dp.sign(message)
                is_valid = dp.verify(message, signature)
                assert is_valid
        
        threads = []
        for _ in range(4):  # 4 threads each
            threads.append(threading.Thread(target=kyber_worker))
            threads.append(threading.Thread(target=dilithium_worker))
        
        start_time = time.time()
        for thread in threads:
            thread.start()
        
        for thread in threads:
            thread.join()
        
        total_time = time.time() - start_time
        print(f"Stress test completed in {total_time:.2f}s")
        assert total_time < 30, "Stress test should complete within 30 seconds"
    
    def test_memory_stress(self):
        """Test memory usage under stress"""
        keypairs = []
        for _ in range(100):
            kp = KyberKeyPair()
            dp = DilithiumKeyPair()
            keypairs.append((kp, dp))
        
        for kp, dp in keypairs:
            shared_secret, ciphertext = kp.encapsulate()
            recovered_secret = kp.decapsulate(ciphertext)
            assert shared_secret == recovered_secret
            
            message = b"Memory stress test"
            signature = dp.sign(message)
            is_valid = dp.verify(message, signature)
            assert is_valid
        
        del keypairs

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_kyber_error_handling(self):
        """Test Kyber error handling"""
        kp = KyberKeyPair()
        
        with pytest.raises(KyberError):
            kp.decapsulate(b"too_short")
        
        with pytest.raises(KyberError):
            kp.decapsulate(b"x" * 2000)  # Wrong size
    
    def test_dilithium_error_handling(self):
        """Test Dilithium error handling"""
        dp = DilithiumKeyPair()
        
        message = b"Test message"
        invalid_signature = b"invalid"
        
        is_valid = dp.verify(message, invalid_signature)
        assert not is_valid, "Invalid signature should not verify"
    
    def test_cross_keypair_operations(self):
        """Test operations between different keypairs"""
        kp1 = KyberKeyPair()
        kp2 = KyberKeyPair()
        
        shared_secret, ciphertext = kp1.encapsulate()
        
        recovered_secret = kp2.decapsulate(ciphertext)
        assert shared_secret != recovered_secret, "Cross-keypair decapsulation should produce different secrets"
        
        dp1 = DilithiumKeyPair()
        dp2 = DilithiumKeyPair()
        
        message = b"Test message"
        signature = dp1.sign(message)
        
        is_valid = dp2.verify(message, signature)
        assert not is_valid, "Signature from different keypair should not verify"

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
