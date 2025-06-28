import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth, ValidationError

class TestInputValidation:
    
    def test_username_validation(self):
        """Test username input validation"""
        pqc = PQCAuth()
        
        with pytest.raises(ValidationError):
            pqc.validate_username("")
            
        with pytest.raises(ValidationError):
            pqc.validate_username("a" * 256)
            
        with pytest.raises(ValidationError):
            pqc.validate_username("admin'; DROP TABLE users; --")
            
        assert pqc.validate_username("valid_user123") == True
    
    def test_key_data_validation(self):
        """Test cryptographic key validation"""
        pqc = PQCAuth()
        
        with pytest.raises(ValidationError):
            pqc.validate_public_key(b"")
            
        with pytest.raises(ValidationError):
            pqc.validate_public_key(b"short")
            
        valid_key = b"0" * 1184
        assert pqc.validate_public_key(valid_key) == True
    
    def test_message_sanitization(self):
        """Test message input sanitization"""
        pqc = PQCAuth()
        
        malicious_input = "<script>alert('xss')</script>"
        sanitized = pqc.sanitize_message(malicious_input)
        assert "<script>" not in sanitized
        
        normal_message = "Hello, World!"
        assert pqc.sanitize_message(normal_message) == normal_message
