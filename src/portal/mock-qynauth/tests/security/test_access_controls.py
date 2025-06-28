import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_pqc_module import PQCAuth, AccessDeniedError

class TestAccessControls:
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access protected functions"""
        pqc = PQCAuth()
        
        with pytest.raises(AccessDeniedError):
            pqc.generate_keypair()  # Requires authentication
            
        with pytest.raises(AccessDeniedError):
            pqc.sign_message("test message")  # Requires authentication
    
    def test_authenticated_access_allowed(self):
        """Test that authenticated users can access protected functions"""
        pqc = PQCAuth()
        
        pqc.authenticate("test_user", "test_password")
        assert pqc.is_authenticated() == True
        
        keypair = pqc.generate_keypair()
        assert keypair is not None
        
        signature = pqc.sign_message("test message")
        assert signature is not None
    
    def test_session_timeout(self):
        """Test that sessions timeout after inactivity"""
        pqc = PQCAuth()
        
        pqc.authenticate("test_user", "test_password")
        assert pqc.is_authenticated() == True
        
        pqc._simulate_timeout()
        
        with pytest.raises(AccessDeniedError):
            pqc.generate_keypair()
    
    def test_role_based_access(self):
        """Test role-based access control"""
        pqc = PQCAuth()
        
        pqc.authenticate("regular_user", "password", role="user")
        
        with pytest.raises(AccessDeniedError):
            pqc.admin_reset_all_keys()
        
        pqc.authenticate("admin_user", "admin_pass", role="admin")
        
        result = pqc.admin_reset_all_keys()
        assert result == True
