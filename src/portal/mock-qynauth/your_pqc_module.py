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
        self.authenticated = True
        self.user_role = role
        return True
    
    def is_authenticated(self):
        """Check if user is authenticated"""
        return self.authenticated and self.session_active
    
    def generate_keypair(self):
        """Generate keypair (requires authentication)"""
        if not self.is_authenticated():
            raise AccessDeniedError("Authentication required")
        return {"public_key": b"mock_public_key", "private_key": b"mock_private_key"}
    
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
