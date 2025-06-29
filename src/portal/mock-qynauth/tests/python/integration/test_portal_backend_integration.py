"""
Integration Tests for Portal Backend PQC Integration

This module tests the integration between the Portal Backend authentication
service and the enhanced Python PQC bindings.
"""

import pytest
import asyncio
import sys
import os
import json
from unittest.mock import Mock, patch, AsyncMock

sys.path.append(os.path.join(os.path.dirname(__file__), '../../../src/python_app'))

from auth.pqc_auth import PQCAuthenticationService, PQCAuthConfig

@pytest.mark.integration
class TestPortalBackendIntegration:
    """Integration tests for Portal Backend PQC integration."""
    
    @pytest.fixture
    def pqc_auth_config(self):
        """PQC authentication configuration for testing."""
        return PQCAuthConfig(
            kyber_enabled=True,
            dilithium_enabled=True,
            session_timeout=3600,
            max_concurrent_sessions=100
        )
    
    @pytest.fixture
    def pqc_auth_service(self, pqc_auth_config):
        """PQC authentication service instance."""
        return PQCAuthenticationService(pqc_auth_config)
    
    @pytest.mark.asyncio
    async def test_pqc_session_key_generation(self, pqc_auth_service, test_user_id):
        """Test PQC session key generation."""
        session_data = await pqc_auth_service.generate_pqc_session_key(test_user_id)
        
        assert session_data is not None
        assert session_data['user_id'] == test_user_id
        assert 'shared_secret' in session_data
        assert session_data['algorithm'] == 'ML-KEM-768'
        assert 'session_id' in session_data
        assert 'public_key_hash' in session_data
    
    @pytest.mark.asyncio
    async def test_pqc_token_signing(self, pqc_auth_service, test_user_id, test_message):
        """Test PQC token signing."""
        token_data = {
            'user_id': test_user_id,
            'permissions': ['read', 'write'],
            'expires_at': '2025-12-31T23:59:59Z'
        }
        
        signed_token = await pqc_auth_service.sign_pqc_token(token_data, test_user_id)
        
        assert signed_token is not None
        assert 'signature' in signed_token
        assert 'algorithm' in signed_token
        assert signed_token['algorithm'] == 'ML-DSA-65'
        assert 'token_data' in signed_token
    
    @pytest.mark.asyncio
    async def test_pqc_token_verification(self, pqc_auth_service, test_user_id):
        """Test PQC token verification."""
        token_data = {
            'user_id': test_user_id,
            'permissions': ['read'],
            'expires_at': '2025-12-31T23:59:59Z'
        }
        
        signed_token = await pqc_auth_service.sign_pqc_token(token_data, test_user_id)
        
        is_valid = await pqc_auth_service.verify_pqc_token(signed_token, test_user_id)
        
        assert is_valid == True
    
    @pytest.mark.asyncio
    async def test_pqc_service_status(self, pqc_auth_service):
        """Test PQC service status check."""
        status = await pqc_auth_service.get_service_status()
        
        assert status is not None
        assert 'kyber_available' in status
        assert 'dilithium_available' in status
        assert 'active_sessions' in status
        assert isinstance(status['active_sessions'], int)
    
    @pytest.mark.asyncio
    async def test_concurrent_session_generation(self, pqc_auth_service):
        """Test concurrent PQC session generation."""
        user_ids = [f"test_user_{i}" for i in range(5)]
        
        tasks = [
            pqc_auth_service.generate_pqc_session_key(user_id)
            for user_id in user_ids
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 5
        for i, result in enumerate(results):
            assert result['user_id'] == user_ids[i]
            assert 'shared_secret' in result
    
    @pytest.mark.asyncio
    async def test_session_cleanup(self, pqc_auth_service, test_user_id):
        """Test PQC session cleanup."""
        session_data = await pqc_auth_service.generate_pqc_session_key(test_user_id)
        session_id = session_data['session_id']
        
        cleanup_result = await pqc_auth_service.cleanup_session(session_id)
        
        assert cleanup_result == True
    
    @pytest.mark.asyncio
    async def test_error_handling_invalid_user(self, pqc_auth_service):
        """Test error handling with invalid user ID."""
        with pytest.raises(ValueError, match="User ID cannot be empty"):
            await pqc_auth_service.generate_pqc_session_key("")
    
    @pytest.mark.asyncio
    async def test_performance_monitoring_integration(self, pqc_auth_service, test_user_id):
        """Test integration with performance monitoring."""
        with patch('auth.pqc_auth.performance_monitor') as mock_monitor:
            mock_context = Mock()
            mock_monitor.monitor_operation.return_value.__aenter__ = AsyncMock(return_value=mock_context)
            mock_monitor.monitor_operation.return_value.__aexit__ = AsyncMock(return_value=None)
            
            session_data = await pqc_auth_service.generate_pqc_session_key(test_user_id)
            
            mock_monitor.monitor_operation.assert_called()
    
    @pytest.mark.asyncio
    async def test_logging_integration(self, pqc_auth_service, test_user_id):
        """Test integration with PQC logging."""
        with patch('auth.pqc_auth.pqc_logger') as mock_logger:
            session_data = await pqc_auth_service.generate_pqc_session_key(test_user_id)
            
            mock_logger.log_key_generation.assert_called()
    
    @pytest.mark.asyncio
    async def test_fallback_to_classical_auth(self, pqc_auth_service, test_user_id):
        """Test fallback to classical authentication when PQC fails."""
        with patch.object(pqc_auth_service, '_generate_kyber_session', side_effect=Exception("PQC failure")):
            session_data = await pqc_auth_service.generate_pqc_session_key(test_user_id)
            
            assert session_data is not None
            assert session_data['user_id'] == test_user_id
            assert 'fallback_used' in session_data
            assert session_data['fallback_used'] == True

@pytest.mark.integration
class TestPQCServiceBridge:
    """Integration tests for PQC service bridge."""
    
    def test_service_bridge_generate_session_key(self, test_user_id):
        """Test service bridge session key generation."""
        from pqc_service_bridge import handle_generate_session_key
        
        params = {'user_id': test_user_id}
        result = handle_generate_session_key(params)
        
        assert result['success'] == True
        assert 'session_data' in result
        assert result['session_data']['user_id'] == test_user_id
    
    def test_service_bridge_sign_token(self, test_user_id):
        """Test service bridge token signing."""
        from pqc_service_bridge import handle_sign_token
        
        params = {
            'token_data': {'user_id': test_user_id, 'permissions': ['read']},
            'user_id': test_user_id
        }
        result = handle_sign_token(params)
        
        assert result['success'] == True
        assert 'signed_token' in result
    
    def test_service_bridge_verify_token(self, test_user_id):
        """Test service bridge token verification."""
        from pqc_service_bridge import handle_sign_token, handle_verify_token
        
        sign_params = {
            'token_data': {'user_id': test_user_id, 'permissions': ['read']},
            'user_id': test_user_id
        }
        sign_result = handle_sign_token(sign_params)
        
        verify_params = {
            'signed_token': sign_result['signed_token'],
            'user_id': test_user_id
        }
        verify_result = handle_verify_token(verify_params)
        
        assert verify_result['success'] == True
        assert verify_result['is_valid'] == True
    
    def test_service_bridge_status(self):
        """Test service bridge status check."""
        from pqc_service_bridge import handle_status
        
        result = handle_status({})
        
        assert result['success'] == True
        assert 'status' in result
        assert 'kyber_available' in result['status']
        assert 'dilithium_available' in result['status']
