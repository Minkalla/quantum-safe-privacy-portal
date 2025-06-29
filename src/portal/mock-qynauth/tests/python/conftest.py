"""
Pytest Configuration for PQC Integration Tests

This module provides shared fixtures and configuration for all PQC tests.
"""

import pytest
import sys
import os
from pathlib import Path

test_dir = Path(__file__).parent
project_root = test_dir.parent.parent
python_app_dir = project_root / "src" / "python_app"
portal_backend_dir = project_root.parent / "portal-backend" / "src"

sys.path.insert(0, str(python_app_dir))
sys.path.insert(0, str(portal_backend_dir))

@pytest.fixture(scope="session")
def pqc_test_config():
    """Test configuration for PQC operations."""
    return {
        "test_user_id": "test_user_123",
        "test_algorithms": ["ML-KEM-768", "ML-DSA-65"],
        "performance_thresholds": {
            "key_generation_ms": 100,
            "encapsulation_ms": 50,
            "decapsulation_ms": 50,
            "signature_ms": 80,
            "verification_ms": 30
        },
        "test_iterations": {
            "unit": 5,
            "performance": 10,
            "stress": 100
        }
    }

@pytest.fixture
def test_user_id(pqc_test_config):
    """Test user ID for PQC operations."""
    return pqc_test_config["test_user_id"]

@pytest.fixture
def test_message():
    """Standard test message for cryptographic operations."""
    return b"This is a test message for PQC operations"

@pytest.fixture
def test_metadata():
    """Standard test metadata for PQC operations."""
    return {
        "test_session": True,
        "environment": "test",
        "compliance_level": "NIST_SP_800_53"
    }

@pytest.fixture(autouse=True)
def setup_test_logging():
    """Setup test-specific logging configuration."""
    import logging
    
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

@pytest.fixture
def mock_pqc_library():
    """Mock PQC library for testing without actual FFI dependencies."""
    class MockPQCLibrary:
        def __init__(self):
            self.available = True
            
        def generate_keypair(self, algorithm):
            return {
                "public_key": b"mock_public_key_" + algorithm.encode(),
                "private_key": b"mock_private_key_" + algorithm.encode()
            }
            
        def encapsulate(self, public_key):
            return {
                "shared_secret": b"mock_shared_secret",
                "ciphertext": b"mock_ciphertext"
            }
            
        def decapsulate(self, private_key, ciphertext):
            return b"mock_shared_secret"
            
        def sign(self, private_key, message):
            return b"mock_signature"
            
        def verify(self, public_key, message, signature):
            return signature == b"mock_signature"
    
    return MockPQCLibrary()

def pytest_configure(config):
    """Configure custom pytest markers."""
    config.addinivalue_line(
        "markers", "unit: Unit tests for individual components"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests for system components"
    )
    config.addinivalue_line(
        "markers", "performance: Performance and benchmark tests"
    )
    config.addinivalue_line(
        "markers", "slow: Tests that take longer to run"
    )
    config.addinivalue_line(
        "markers", "requires_ffi: Tests that require actual FFI library"
    )
