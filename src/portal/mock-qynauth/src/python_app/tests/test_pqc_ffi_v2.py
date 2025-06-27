import pytest
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from pqc_bindings_v2 import PQCLibraryV2, MLKEMKeyPair, MLDSAKeyPair, PerformanceMonitor, PQCError, FFIErrorCode
except ImportError:
    pytest.skip("PQC Library V2 not available - Rust library may not be built", allow_module_level=True)

class TestPQCFFIV2:
    @pytest.fixture(scope="class")
    def pqc_lib(self):
        try:
            return PQCLibraryV2()
        except PQCError:
            pytest.skip("PQC Library V2 not available - Rust library may not be built")
    
    def test_library_initialization(self, pqc_lib):
        assert pqc_lib is not None
        assert pqc_lib.lib is not None
    
    def test_mlkem_keypair_generation(self, pqc_lib):
        keypair = MLKEMKeyPair(pqc_lib)
        assert keypair is not None
        
        public_key = keypair.get_public_key()
        assert isinstance(public_key, bytes)
        assert len(public_key) > 0
    
    def test_mlkem_encapsulation_decapsulation(self, pqc_lib):
        keypair = MLKEMKeyPair(pqc_lib)
        
        ciphertext, shared_secret = keypair.encapsulate()
        assert isinstance(ciphertext, bytes)
        assert isinstance(shared_secret, bytes)
        assert len(ciphertext) > 0
        assert len(shared_secret) > 0
        
        decap_shared_secret = keypair.decapsulate(ciphertext)
        assert isinstance(decap_shared_secret, bytes)
        assert shared_secret == decap_shared_secret
    
    def test_mldsa_keypair_generation(self, pqc_lib):
        keypair = MLDSAKeyPair(pqc_lib)
        assert keypair is not None
        
        public_key = keypair.get_public_key()
        assert isinstance(public_key, bytes)
        assert len(public_key) > 0
    
    def test_mldsa_sign_verify(self, pqc_lib):
        keypair = MLDSAKeyPair(pqc_lib)
        message = b"Test message for signing"
        
        signature = keypair.sign(message)
        assert isinstance(signature, bytes)
        assert len(signature) > 0
        
        is_valid = keypair.verify(message, signature)
        assert is_valid is True
        
        invalid_is_valid = keypair.verify(b"Different message", signature)
        assert invalid_is_valid is False
    
    def test_performance_monitoring(self, pqc_lib):
        monitor = PerformanceMonitor(pqc_lib)
        
        mlkem_keypair = MLKEMKeyPair(pqc_lib)
        mldsa_keypair = MLDSAKeyPair(pqc_lib)
        
        message = b"Performance test message"
        signature = mldsa_keypair.sign(message)
        mldsa_keypair.verify(message, signature)
        
        counts = monitor.get_operation_counts()
        assert isinstance(counts, tuple)
        assert len(counts) == 3
        assert all(isinstance(count, int) for count in counts)
        assert counts[0] >= 2
        assert counts[1] >= 1
        assert counts[2] >= 1
        
        times = monitor.get_avg_operation_times()
        assert isinstance(times, tuple)
        assert len(times) == 2
        assert all(isinstance(time, float) for time in times)
        assert all(time >= 0 for time in times)
    
    def test_multiple_operations(self, pqc_lib):
        for i in range(3):
            mlkem_keypair = MLKEMKeyPair(pqc_lib)
            ciphertext, shared_secret = mlkem_keypair.encapsulate()
            decap_shared_secret = mlkem_keypair.decapsulate(ciphertext)
            assert shared_secret == decap_shared_secret
            
            mldsa_keypair = MLDSAKeyPair(pqc_lib)
            message = f"Test message {i}".encode()
            signature = mldsa_keypair.sign(message)
            assert mldsa_keypair.verify(message, signature)
    
    def test_error_handling(self, pqc_lib):
        keypair = MLKEMKeyPair(pqc_lib)
        
        with pytest.raises(PQCError):
            keypair.decapsulate(b"invalid_ciphertext")
    
    def test_memory_cleanup(self, pqc_lib):
        keypairs = []
        for i in range(10):
            mlkem_keypair = MLKEMKeyPair(pqc_lib)
            mldsa_keypair = MLDSAKeyPair(pqc_lib)
            keypairs.append((mlkem_keypair, mldsa_keypair))
        
        del keypairs

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
