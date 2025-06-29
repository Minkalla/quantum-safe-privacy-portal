"""
Performance Tests for PQC Operations

This module contains performance benchmarks and stress tests for
Post-Quantum Cryptography operations.
"""

import pytest
import time
import statistics
import sys
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from unittest.mock import patch

sys.path.append(os.path.join(os.path.dirname(__file__), '../../../src/python_app'))

from pqc_bindings.kyber import KyberKeyPair
from pqc_bindings.dilithium import DilithiumKeyPair

@pytest.mark.performance
class TestPQCPerformance:
    """Performance tests for PQC operations."""
    
    def test_kyber_keygen_performance(self, mock_pqc_library, pqc_test_config):
        """Test Kyber key generation performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["key_generation_ms"]
        times = []
        
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            for _ in range(iterations):
                start = time.time()
                keypair = KyberKeyPair(mock_pqc_library)
                end = time.time()
                times.append((end - start) * 1000)  # Convert to ms
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        min_time = min(times)
        std_dev = statistics.stdev(times) if len(times) > 1 else 0
        
        assert avg_time < threshold_ms, f"Average key generation time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        assert max_time < threshold_ms * 2, f"Maximum key generation time {max_time:.2f}ms exceeds {threshold_ms * 2}ms"
        
        print(f"Kyber key generation - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms, Min: {min_time:.2f}ms, StdDev: {std_dev:.2f}ms")
    
    def test_kyber_encapsulation_performance(self, mock_pqc_library, pqc_test_config, test_user_id):
        """Test Kyber encapsulation performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["encapsulation_ms"]
        times = []
        
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            for i in range(iterations):
                start = time.time()
                shared_secret, ciphertext = keypair.encapsulate(f"{test_user_id}_{i}")
                end = time.time()
                times.append((end - start) * 1000)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        assert avg_time < threshold_ms, f"Average encapsulation time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        assert max_time < threshold_ms * 2, f"Maximum encapsulation time {max_time:.2f}ms exceeds {threshold_ms * 2}ms"
        
        print(f"Kyber encapsulation - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms")
    
    def test_kyber_decapsulation_performance(self, mock_pqc_library, pqc_test_config, test_user_id):
        """Test Kyber decapsulation performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["decapsulation_ms"]
        times = []
        
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = KyberKeyPair(mock_pqc_library)
            
            ciphertexts = []
            for i in range(iterations):
                _, ciphertext = keypair.encapsulate(f"{test_user_id}_{i}")
                ciphertexts.append(ciphertext)
            
            for i, ciphertext in enumerate(ciphertexts):
                start = time.time()
                shared_secret = keypair.decapsulate(ciphertext, f"{test_user_id}_{i}")
                end = time.time()
                times.append((end - start) * 1000)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        assert avg_time < threshold_ms, f"Average decapsulation time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        assert max_time < threshold_ms * 2, f"Maximum decapsulation time {max_time:.2f}ms exceeds {threshold_ms * 2}ms"
        
        print(f"Kyber decapsulation - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms")
    
    def test_dilithium_keygen_performance(self, mock_pqc_library, pqc_test_config):
        """Test Dilithium key generation performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["key_generation_ms"]
        times = []
        
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            for _ in range(iterations):
                start = time.time()
                keypair = DilithiumKeyPair(mock_pqc_library)
                end = time.time()
                times.append((end - start) * 1000)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        assert avg_time < threshold_ms, f"Average Dilithium key generation time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        
        print(f"Dilithium key generation - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms")
    
    def test_dilithium_signature_performance(self, mock_pqc_library, pqc_test_config, test_user_id, test_message):
        """Test Dilithium signature performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["signature_ms"]
        times = []
        
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            for i in range(iterations):
                message = f"{test_message.decode()}_{i}".encode()
                start = time.time()
                signature = keypair.sign(message, f"{test_user_id}_{i}")
                end = time.time()
                times.append((end - start) * 1000)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        assert avg_time < threshold_ms, f"Average signature time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        assert max_time < threshold_ms * 2, f"Maximum signature time {max_time:.2f}ms exceeds {threshold_ms * 2}ms"
        
        print(f"Dilithium signature - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms")
    
    def test_dilithium_verification_performance(self, mock_pqc_library, pqc_test_config, test_user_id, test_message):
        """Test Dilithium verification performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        threshold_ms = pqc_test_config["performance_thresholds"]["verification_ms"]
        times = []
        
        with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
            keypair = DilithiumKeyPair(mock_pqc_library)
            
            signatures = []
            messages = []
            for i in range(iterations):
                message = f"{test_message.decode()}_{i}".encode()
                signature = keypair.sign(message, f"{test_user_id}_{i}")
                signatures.append(signature)
                messages.append(message)
            
            for i, (message, signature) in enumerate(zip(messages, signatures)):
                start = time.time()
                is_valid = keypair.verify(message, signature, f"{test_user_id}_{i}")
                end = time.time()
                times.append((end - start) * 1000)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        assert avg_time < threshold_ms, f"Average verification time {avg_time:.2f}ms exceeds {threshold_ms}ms"
        assert max_time < threshold_ms * 2, f"Maximum verification time {max_time:.2f}ms exceeds {threshold_ms * 2}ms"
        
        print(f"Dilithium verification - Avg: {avg_time:.2f}ms, Max: {max_time:.2f}ms")
    
    @pytest.mark.slow
    def test_concurrent_kyber_operations(self, mock_pqc_library, pqc_test_config, test_user_id):
        """Test concurrent Kyber operations performance."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        max_workers = 4
        
        def kyber_operation(user_id):
            with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
                keypair = KyberKeyPair(mock_pqc_library)
                shared_secret, ciphertext = keypair.encapsulate(user_id)
                recovered_secret = keypair.decapsulate(ciphertext, user_id)
                return shared_secret == recovered_secret
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(kyber_operation, f"{test_user_id}_{i}")
                for i in range(iterations)
            ]
            
            results = [future.result() for future in as_completed(futures)]
        
        end_time = time.time()
        total_time = (end_time - start_time) * 1000
        
        assert all(results), "Some concurrent Kyber operations failed"
        
        avg_time_per_op = total_time / iterations
        assert avg_time_per_op < 200, f"Average time per concurrent operation {avg_time_per_op:.2f}ms exceeds 200ms"
        
        print(f"Concurrent Kyber operations - Total: {total_time:.2f}ms, Avg per op: {avg_time_per_op:.2f}ms")
    
    @pytest.mark.slow
    def test_memory_usage_stability(self, mock_pqc_library, pqc_test_config, test_user_id):
        """Test memory usage stability during repeated operations."""
        iterations = pqc_test_config["test_iterations"]["stress"]
        
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.dilithium.PQCLibraryV2', return_value=mock_pqc_library):
                for i in range(iterations):
                    kyber_keypair = KyberKeyPair(mock_pqc_library)
                    shared_secret, ciphertext = kyber_keypair.encapsulate(f"{test_user_id}_{i}")
                    recovered_secret = kyber_keypair.decapsulate(ciphertext, f"{test_user_id}_{i}")
                    
                    dilithium_keypair = DilithiumKeyPair(mock_pqc_library)
                    message = f"Test message {i}".encode()
                    signature = dilithium_keypair.sign(message, f"{test_user_id}_{i}")
                    is_valid = dilithium_keypair.verify(message, signature, f"{test_user_id}_{i}")
                    
                    del kyber_keypair
                    del dilithium_keypair
                    
                    assert shared_secret == recovered_secret
                    assert is_valid == True
        
        print(f"Memory stability test completed - {iterations} iterations")
    
    def test_performance_monitoring_overhead(self, mock_pqc_library, pqc_test_config, test_user_id):
        """Test performance monitoring overhead."""
        iterations = pqc_test_config["test_iterations"]["performance"]
        
        times_without_monitoring = []
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            with patch('pqc_bindings.kyber.performance_monitor') as mock_monitor:
                mock_monitor.monitor_operation.return_value.__enter__ = lambda: None
                mock_monitor.monitor_operation.return_value.__exit__ = lambda *args: None
                
                for i in range(iterations):
                    start = time.time()
                    keypair = KyberKeyPair(mock_pqc_library)
                    shared_secret, ciphertext = keypair.encapsulate(f"{test_user_id}_{i}")
                    end = time.time()
                    times_without_monitoring.append((end - start) * 1000)
        
        times_with_monitoring = []
        with patch('pqc_bindings.kyber.PQCLibraryV2', return_value=mock_pqc_library):
            for i in range(iterations):
                start = time.time()
                keypair = KyberKeyPair(mock_pqc_library)
                shared_secret, ciphertext = keypair.encapsulate(f"{test_user_id}_{i}")
                end = time.time()
                times_with_monitoring.append((end - start) * 1000)
        
        avg_without = statistics.mean(times_without_monitoring)
        avg_with = statistics.mean(times_with_monitoring)
        overhead_percent = ((avg_with - avg_without) / avg_without) * 100
        
        assert overhead_percent < 20, f"Performance monitoring overhead {overhead_percent:.1f}% exceeds 20%"
        
        print(f"Performance monitoring overhead - Without: {avg_without:.2f}ms, With: {avg_with:.2f}ms, Overhead: {overhead_percent:.1f}%")
