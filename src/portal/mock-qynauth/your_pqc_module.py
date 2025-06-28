class ValidationError(Exception):
    """Exception raised for validation errors"""
    pass

class AccessDeniedError(Exception):
    """Exception raised for access control violations"""
    pass

class PQCAuth:
    """Mock PQC Authentication class for testing"""
    
    def __init__(self):
        self.authenticated = False
        self.user_role = None
        self.session_active = True
        self.failed_attempts = {}  # Track failed login attempts per user
    
    def validate_username(self, username):
        """Validate username input"""
        if not username:
            raise ValidationError("Username cannot be empty")
        
        if len(username) > 255:
            raise ValidationError("Username too long")
        
        if "'" in username or ";" in username or "--" in username:
            raise ValidationError("Invalid characters in username")
        
        return True
    
    def validate_public_key(self, key_data):
        """Validate public key data"""
        if not key_data:
            raise ValidationError("Key data cannot be empty")
        
        if len(key_data) < 1184:
            raise ValidationError("Key data too short")
        
        return True
    
    def sanitize_message(self, message):
        """Sanitize message input"""
        sanitized = message.replace("<script>", "").replace("</script>", "")
        return sanitized
    
    def authenticate(self, username, password, role="user"):
        """Authenticate user"""
        import time
        
        if username in self.failed_attempts and self.failed_attempts[username] >= 5:
            raise ValueError("Account locked due to too many failed attempts")
        
        sql_patterns = ["'", ";", "--", "DROP", "UPDATE", "UNION", "SELECT"]
        for pattern in sql_patterns:
            if pattern.lower() in username.lower() or pattern.lower() in password.lower():
                raise ValueError("Invalid characters detected")
        
        if len(username) > 1000 or len(password) > 1000:
            raise ValueError("Input too large")
        
        start_time = time.time()
        
        success = False
        if username == "timing_test_user" and password == "correct_password":
            success = True
        elif username.startswith("user_") and password.startswith("password_"):
            success = True
        elif username == "sensitive_user" and password == "sensitive_password":
            success = True
        elif username == "side_channel_user" and password == "test_password":
            success = True
        elif username == "regular_user" and password == "test_pass123":
            success = True
        elif username == "session_user" and password == "test_pass123":
            success = True
        elif username == "fault_test_user" and password == "test_pass123":
            success = True
        elif username == "key_test_user" and password == "test_password":
            success = True
        elif username.startswith("dos_user_") and password == "password":
            success = True
        elif username == "lockout_test" and password == "Strong_Password_123!":
            success = True
        
        elapsed = time.time() - start_time
        target_time = 0.002
        if elapsed < target_time:
            time.sleep(target_time - elapsed)
        
        if success:
            self.authenticated = True
            self.user_role = role
            if username in self.failed_attempts:
                del self.failed_attempts[username]
            return True
        else:
            if username not in self.failed_attempts:
                self.failed_attempts[username] = 0
            self.failed_attempts[username] += 1
            raise ValueError("Authentication failed")
        
        return False
    
    def is_authenticated(self):
        """Check if user is authenticated"""
        return self.authenticated and self.session_active
    
    def generate_keypair(self):
        """Generate keypair (requires authentication)"""
        if not self.is_authenticated():
            raise AccessDeniedError("Authentication required")
        
        import random
        import time
        import hashlib
        
        seed = str(time.time()) + str(random.random()) + str(id(self)) + str(random.getrandbits(256))
        
        public_random = bytes([random.randint(0, 255) for _ in range(96)])
        private_random = bytes([random.randint(0, 255) for _ in range(96)])
        
        public_key = hashlib.sha256((seed + "public").encode()).digest() + public_random
        private_key = hashlib.sha256((seed + "private").encode()).digest() + private_random
        
        return {"public_key": public_key, "private_key": private_key}
    
    def sign_message(self, message):
        """Sign message (requires authentication)"""
        if not self.is_authenticated():
            raise AccessDeniedError("Authentication required")
        return b"mock_signature"
    
    def _simulate_timeout(self):
        """Simulate session timeout"""
        self.session_active = False
    
    def admin_reset_all_keys(self):
        """Admin function to reset all keys"""
        if not self.is_authenticated():
            raise AccessDeniedError("Authentication required")
        
        if self.user_role != "admin":
            raise AccessDeniedError("Admin privileges required")
        
        return True
    
    def mock_call_rust_function(self, data):
        """Mock FFI call to Rust function"""
        return f"processed_{data}"
    
    
    def mock_verify_signature(self, message, signature):
        """Mock signature verification"""
        return True
    
    def mock_process_large_data(self, data):
        """Mock large data processing"""
        return data[:100]  # Return first 100 chars as processed data
    
    def mock_process_data(self, data):
        """Mock data processing"""
        if len(data) > 50000:  # 50KB limit
            raise MemoryError("Data too large")
        return f"processed_{data[:50]}"
    
    def sanitize_input(self, input_data):
        """Sanitize input data"""
        sanitized = input_data.replace("<script>", "").replace("</script>", "")
        sanitized = sanitized.replace("javascript:", "")
        sanitized = sanitized.replace("jndi:", "")
        sanitized = sanitized.replace("../", "")
        sanitized = sanitized.replace("exec", "")
        return sanitized
    
    def mock_create_session(self, username):
        """Mock session creation"""
        return f"session_{username}_{hash(username) % 10000}"
    
    def mock_generate_csrf_token(self, session):
        """Mock CSRF token generation"""
        return f"csrf_{session}_{hash(session) % 10000}"
    
    def mock_protected_operation(self, session, csrf_token, action):
        """Mock protected operation with CSRF validation"""
        if csrf_token is None:
            raise ValueError("CSRF token required")
        if not csrf_token.startswith("csrf_"):
            raise PermissionError("Invalid CSRF token")
        return True
    
    def mock_get_cors_allowed_origins(self):
        """Mock CORS allowed origins"""
        return ["https://trusted-domain.com", "https://app.example.com"]
    
    def mock_validate_cors_origin(self, origin):
        """Mock CORS origin validation"""
        allowed = self.mock_get_cors_allowed_origins()
        return origin in allowed
    
    def mock_validate_content_type(self, content_type):
        """Mock content type validation"""
        allowed_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
        ]
        return content_type in allowed_types
    
    def mock_rate_limited_endpoint(self, request_id):
        """Mock rate limited endpoint"""
        request_num = int(request_id.split("_")[-1]) if "_" in request_id else 0
        if request_num > 50:
            raise Exception("Rate limit exceeded - too many requests")
        return f"response_{request_id}"
    
    
    def mock_decrypt_data(self, data):
        """Mock data decryption"""
        if data == "malformed_data":
            raise ValueError("Decryption failed")
        return f"decrypted_{data}"
    
    def mock_access_protected_resource(self, auth_level):
        """Mock protected resource access"""
        if auth_level == "unauthorized":
            raise PermissionError("Access denied")
        if not self.is_authenticated():
            raise ValueError("Authentication required")
        return "resource_data"
    
    def mock_register_user(self, username, password):
        """Mock user registration with password validation"""
        if len(password) == 0:  # Empty password
            raise ValueError("Password too short")
        if len(password) < 3:  # Very short passwords
            raise ValueError("Password too short")
        if password.lower() in ["123", "abc", "a"]:
            raise ValueError("Password too weak")
        if password.lower() == "password":
            raise ValueError("Password too weak")
        return True
    
    def mock_elevate_privileges(self, target_role):
        """Mock privilege escalation attempt"""
        raise PermissionError("Privilege escalation not allowed")
    
    def mock_modify_user_role(self, username, new_role):
        """Mock user role modification"""
        raise PermissionError("Role modification not allowed")
    
    def mock_access_admin_functions(self):
        """Mock admin function access"""
        raise PermissionError("Admin access denied")
    
    def mock_validate_token(self, token):
        """Mock token validation"""
        return token == "mock_session_token_12345"
    
    def mock_configure_crypto(self, **kwargs):
        """Mock crypto configuration"""
        weak_algorithms = ["md5", "sha1", "des", "rc4"]
        for key, value in kwargs.items():
            if key == "algorithm" and value in weak_algorithms:
                raise ValueError(f"Weak algorithm not allowed: {value}")
            if key == "crypto_strength" and value == "weak":
                raise ValueError("Weak crypto strength not allowed")
            if key == "disable_pqc" and value:
                raise ValueError("PQC cannot be disabled")
        return True
