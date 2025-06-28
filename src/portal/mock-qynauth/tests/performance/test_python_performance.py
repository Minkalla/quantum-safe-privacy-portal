import time
import threading
import pytest
import sys
import os
import psutil

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth

class TestPythonPerformance:
    
    def test_authentication_latency(self):
        """Test authentication latency is under 200ms"""
        pqc = PQCAuth()
        
        pqc.authenticate("test_user", "test_password")
        
        start_time = time.time()
        result = pqc.authenticate("test_user", "test_password")
        elapsed = time.time() - start_time
        
        assert elapsed < 0.2  # Under 200ms
        assert result == True  # Updated to match our mock implementation
    
    def test_key_generation_performance(self):
        """Test key generation performance"""
        pqc = PQCAuth()
        pqc.authenticate("test_user", "test_password")  # Authenticate first
        
        start_time = time.time()
        for _ in range(10):
            keypair = pqc.generate_keypair()
            assert keypair is not None
        elapsed = time.time() - start_time
        
        assert elapsed < 2.0
    
    def test_concurrent_operations(self):
        """Test concurrent operations performance"""
        pqc = PQCAuth()
        results = []
        
        def worker():
            start = time.time()
            pqc.authenticate("test_user", "test_password")
            elapsed = time.time() - start
            results.append(elapsed)
        
        threads = []
        start_time = time.time()
        
        for _ in range(10):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        total_elapsed = time.time() - start_time
        
        assert total_elapsed < 1.0
        
        for result in results:
            assert result < 0.3
    
    def test_memory_usage(self):
        """Test memory usage doesn't grow excessively"""
        pqc = PQCAuth()
        pqc.authenticate("test_user", "test_password")  # Authenticate first
        process = psutil.Process()
        
        initial_memory = process.memory_info().rss
        
        for _ in range(100):
            pqc.authenticate("test_user", "test_password")
            keypair = pqc.generate_keypair()
            del keypair
        
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        assert memory_growth < 50 * 1024 * 1024
    
    def test_throughput_measurement(self):
        """Test operations per second throughput"""
        pqc = PQCAuth()
        
        operations = 0
        start_time = time.time()
        end_time = start_time + 1.0  # Run for 1 second
        
        while time.time() < end_time:
            pqc.authenticate("test_user", "test_password")
            operations += 1
        
        assert operations >= 50
