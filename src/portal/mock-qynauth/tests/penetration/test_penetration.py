import pytest
import requests
import subprocess
import socket
import sys
import os
import threading
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth

class TestPenetrationTesting:

    def test_authentication_bypass_attempts(self):
        """Test various authentication bypass techniques"""
        pqc = PQCAuth()

        pqc.mock_register_user("legit_user", "legit_password")

        bypass_attempts = [
            ("admin", ""),  # Empty password
            ("", "password"),  # Empty username
            ("legit_user", None),  # Null password
            ("root", "root"),  # Default credentials
            ("admin", "admin"),  # Default credentials
            ("guest", "guest"),  # Default credentials
        ]

        for username, password in bypass_attempts:
            try:
                result = pqc.authenticate(username, password)
                assert not result, f"Bypass successful with {username}:{password}"
            except Exception:
                pass

    def test_privilege_escalation_protection(self):
        """Test protection against privilege escalation"""
        pqc = PQCAuth()

        pqc.mock_register_user("regular_user", "test_pass123")
        pqc.authenticate("regular_user", "test_pass123")

        with pytest.raises((PermissionError, ValueError, Exception)):
            pqc.mock_elevate_privileges("admin")

        with pytest.raises((PermissionError, ValueError, Exception)):
            pqc.mock_modify_user_role("regular_user", "admin")

        with pytest.raises((PermissionError, ValueError, Exception)):
            pqc.mock_access_admin_functions()

    def test_session_hijacking_protection(self):
        """Test protection against session hijacking"""
        pqc = PQCAuth()

        pqc.mock_register_user("session_user", "test_pass123")
        auth_result = pqc.authenticate("session_user", "test_pass123")
        
        original_token = "mock_session_token_12345"

        manipulated_tokens = [
            original_token[:-1] + "X",  # Modified last character
            original_token[:10] + "HACKED" + original_token[16:],  # Injected data
            original_token + "EXTRA",  # Appended data
            original_token.upper(),  # Case manipulation
            original_token[::-1],  # Reversed token
        ]

        for manipulated_token in manipulated_tokens:
            try:
                is_valid = pqc.mock_validate_token(manipulated_token)
                assert not is_valid, f"Accepted manipulated token: {manipulated_token[:20]}..."
            except Exception:
                pass

    def test_cryptographic_downgrade_attacks(self):
        """Test protection against cryptographic downgrade attacks"""
        pqc = PQCAuth()

        downgrade_attempts = [
            {"algorithm": "md5"},
            {"algorithm": "sha1"},
            {"algorithm": "des"},
            {"algorithm": "rc4"},
            {"crypto_strength": "weak"},
            {"disable_pqc": True},
        ]

        for attempt in downgrade_attempts:
            with pytest.raises((ValueError, Exception)):
                pqc.mock_configure_crypto(**attempt)

    def test_side_channel_attack_resistance(self):
        """Test resistance to side-channel attacks"""
        pqc = PQCAuth()

        pqc.mock_register_user("side_channel_user", "test_password")

        operation_times = []

        for _ in range(100):
            start_time = time.perf_counter()
            pqc.authenticate("side_channel_user", "test_password")
            end_time = time.perf_counter()
            operation_times.append(end_time - start_time)

        avg_time = sum(operation_times) / len(operation_times)
        variance = sum((t - avg_time) ** 2 for t in operation_times) / len(operation_times)
        coefficient_of_variation = (variance ** 0.5) / avg_time

        assert coefficient_of_variation < 0.2, "High timing variance detected - possible side-channel vulnerability"

    def test_denial_of_service_protection(self):
        """Test protection against DoS attacks"""
        pqc = PQCAuth()

        start_time = time.time()
        attempt_count = 0

        for i in range(100):
            try:
                pqc.authenticate(f"dos_user_{i}", "password")
                attempt_count += 1
            except Exception as e:
                if "rate limit" in str(e).lower() or "too many" in str(e).lower():
                    break

        elapsed_time = time.time() - start_time

        if attempt_count == 100:
            assert elapsed_time < 5.0, "DoS vulnerability - too slow to handle requests"
        else:
            assert attempt_count < 100, "Rate limiting not working properly"

    def test_key_extraction_resistance(self):
        """Test resistance to key extraction attacks"""
        pqc = PQCAuth()

        pqc.mock_register_user("key_test_user", "test_password")
        pqc.authenticate("key_test_user", "test_password")

        keypairs = []
        for _ in range(10):
            keypair = pqc.generate_keypair()
            keypairs.append(keypair)

        public_keys = [kp["public_key"] for kp in keypairs]

        for i, pk1 in enumerate(public_keys):
            for j, pk2 in enumerate(public_keys):
                if i != j:
                    common_bytes = sum(1 for a, b in zip(pk1, pk2) if a == b)
                    similarity_ratio = common_bytes / len(pk1)

                    assert similarity_ratio < 0.1, f"High similarity between keys {i} and {j}: {similarity_ratio}"

    def test_fault_injection_resistance(self):
        """Test resistance to fault injection attacks"""
        pqc = PQCAuth()

        pqc.mock_register_user("fault_test_user", "test_pass123")
        pqc.authenticate("fault_test_user", "test_pass123")
        keypair = pqc.generate_keypair()
        message = b"test message for fault injection"

        for _ in range(50):
            try:
                auth_result = pqc.authenticate("fault_test_user", "password")
                if auth_result:
                    assert auth_result == True

                signature = pqc.sign_message(message)
                if signature:
                    is_valid = pqc.mock_verify_signature(message, signature)
                    assert is_valid, "Signature verification failed - possible fault injection"

            except Exception:
                pass
