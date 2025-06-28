import time
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth

class TestIntegrationPerformance:
    
    def test_rust_python_ffi_latency(self):
        """Test Rust-Python FFI call latency"""
        pqc = PQCAuth()
        
        start_time = time.time()
        result = pqc.mock_call_rust_function("test_data")
        elapsed = time.time() - start_time
        
        assert elapsed < 0.01
        assert result is not None
    
    def test_end_to_end_authentication_flow(self):
        """Test complete authentication flow performance"""
        pqc = PQCAuth()
        
        start_time = time.time()
        
        pqc.mock_register_user("test_user", "test_password")
        auth_result = pqc.authenticate("test_user", "test_password")
        keypair = pqc.generate_keypair()
        signature = pqc.sign_message("test message")
        verification = pqc.mock_verify_signature("test message", signature)
        
        elapsed = time.time() - start_time
        
        assert elapsed < 0.5
        assert auth_result == True
        assert keypair is not None
        assert signature is not None
        assert verification == True
    
    def test_batch_operations_performance(self):
        """Test batch operations performance"""
        pqc = PQCAuth()
        
        users = [f"user_{i}" for i in range(20)]
        
        start_time = time.time()
        for user in users:
            pqc.mock_register_user(user, f"password_{user}")
        registration_time = time.time() - start_time
        
        start_time = time.time()
        for user in users:
            result = pqc.authenticate(user, f"password_{user}")
            assert result == True
        authentication_time = time.time() - start_time
        
        assert registration_time < 2.0
        
        assert authentication_time < 1.0
    
    def test_cross_layer_data_flow(self):
        """Test data flow across Rust/Python layers"""
        pqc = PQCAuth()
        
        large_data = "x" * 10000  # 10KB of data
        
        start_time = time.time()
        
        processed = pqc.mock_process_large_data(large_data)
        
        elapsed = time.time() - start_time
        
        assert elapsed < 0.1
        assert processed is not None
        assert len(processed) > 0
    
    def test_system_resource_efficiency(self):
        """Test overall system resource efficiency"""
        import psutil
        
        pqc = PQCAuth()
        process = psutil.Process()
        
        initial_cpu = process.cpu_percent()
        initial_memory = process.memory_info().rss
        
        start_time = time.time()
        
        for i in range(50):
            pqc.authenticate(f"user_{i}", "password")
            if i % 10 == 0:
                keypair = pqc.generate_keypair()
                del keypair
        
        elapsed = time.time() - start_time
        
        final_cpu = process.cpu_percent()
        final_memory = process.memory_info().rss
        
        assert elapsed < 3.0
        
        memory_growth = final_memory - initial_memory
        assert memory_growth < 30 * 1024 * 1024
