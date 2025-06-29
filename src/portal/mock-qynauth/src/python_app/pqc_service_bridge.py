#!/usr/bin/env python3
"""
PQC Service Bridge

This script provides a bridge between the Node.js backend and the enhanced
Python PQC bindings, enabling seamless integration of quantum-safe cryptography.
"""

import sys
import json
import asyncio
import logging
from typing import Dict, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    sys.path.append('/home/ubuntu/repos/quantum-safe-privacy-portal/src/portal/portal-backend/src/auth')
    from pqc_auth import PQCAuthenticationService, PQCAuthConfig
    PQC_SERVICE_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import PQC authentication service: {e}")
    PQC_SERVICE_AVAILABLE = False

if PQC_SERVICE_AVAILABLE:
    pqc_config = PQCAuthConfig(
        enable_hybrid_mode=True,
        fallback_to_classical=True,
        enable_performance_monitoring=True
    )
    pqc_service = PQCAuthenticationService(pqc_config)
else:
    pqc_service = None

async def handle_generate_session_key(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handle session key generation request."""
    try:
        if not pqc_service:
            return {
                'success': False,
                'error_message': 'PQC service not available'
            }
            
        user_id = params.get('user_id')
        if not user_id:
            return {
                'success': False,
                'error_message': 'user_id parameter required'
            }
        
        metadata = params.get('metadata', {})
        result = await pqc_service.generate_pqc_session_key(user_id, metadata)
        
        if result.session_data:
            session_dict = {
                'user_id': result.session_data.user_id,
                'session_id': result.session_data.session_id,
                'shared_secret': result.session_data.shared_secret,
                'ciphertext': result.session_data.ciphertext,
                'algorithm': result.session_data.algorithm,
                'created_at': result.session_data.created_at.isoformat(),
                'expires_at': result.session_data.expires_at.isoformat(),
                'public_key_hash': result.session_data.public_key_hash,
                'metadata': result.session_data.metadata
            }
        else:
            session_dict = None
        
        return {
            'success': result.success,
            'user_id': result.user_id,
            'session_data': session_dict,
            'token': result.token,
            'algorithm': result.algorithm,
            'error_message': result.error_message,
            'performance_metrics': result.performance_metrics
        }
        
    except Exception as e:
        logger.error(f"Session key generation failed: {e}")
        return {
            'success': False,
            'error_message': f'Session key generation failed: {str(e)}'
        }

async def handle_sign_token(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handle token signing request."""
    try:
        if not pqc_service:
            return {
                'success': False,
                'error_message': 'PQC service not available'
            }
            
        user_id = params.get('user_id')
        payload = params.get('payload')
        
        if not user_id or not payload:
            return {
                'success': False,
                'error_message': 'user_id and payload parameters required'
            }
        
        result = await pqc_service.sign_pqc_token(user_id, payload)
        
        return {
            'success': result.success,
            'user_id': result.user_id,
            'token': result.token,
            'algorithm': result.algorithm,
            'error_message': result.error_message,
            'performance_metrics': result.performance_metrics
        }
        
    except Exception as e:
        logger.error(f"Token signing failed: {e}")
        return {
            'success': False,
            'error_message': f'Token signing failed: {str(e)}'
        }

async def handle_verify_token(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handle token verification request."""
    try:
        if not pqc_service:
            return {
                'success': False,
                'error_message': 'PQC service not available'
            }
            
        token = params.get('token')
        user_id = params.get('user_id')
        
        if not token or not user_id:
            return {
                'success': False,
                'error_message': 'token and user_id parameters required'
            }
        
        result = await pqc_service.verify_pqc_token(token, user_id)
        
        return {
            'success': result.success,
            'user_id': result.user_id,
            'algorithm': result.algorithm,
            'error_message': result.error_message,
            'performance_metrics': result.performance_metrics
        }
        
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return {
            'success': False,
            'error_message': f'Token verification failed: {str(e)}'
        }

async def handle_get_status(params: Dict[str, Any]) -> Dict[str, Any]:
    """Handle status request."""
    try:
        if not pqc_service:
            return {
                'success': False,
                'error_message': 'PQC service not available'
            }
            
        cache_stats = pqc_service.get_cache_stats()
        performance_metrics = pqc_service.get_performance_metrics()
        
        return {
            'success': True,
            'pqc_available': pqc_service.pqc_lib is not None,
            'algorithms_supported': ['ML-KEM-768', 'ML-DSA-65'] if pqc_service.pqc_lib else ['Classical'],
            'cache_stats': cache_stats,
            'performance_metrics': performance_metrics
        }
        
    except Exception as e:
        logger.error(f"Status request failed: {e}")
        return {
            'success': False,
            'error_message': f'Status request failed: {str(e)}'
        }

async def main():
    """Main entry point for the PQC service bridge."""
    if len(sys.argv) < 3:
        print(json.dumps({
            'success': False,
            'error_message': 'Usage: python3 pqc_service_bridge.py <operation> <params_json>'
        }))
        sys.exit(1)
    
    operation = sys.argv[1]
    try:
        params = json.loads(sys.argv[2])
    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error_message': f'Invalid JSON parameters: {str(e)}'
        }))
        sys.exit(1)
    
    if not PQC_SERVICE_AVAILABLE:
        print(json.dumps({
            'success': False,
            'error_message': 'PQC service not available'
        }))
        sys.exit(1)
    
    handlers = {
        'generate_session_key': handle_generate_session_key,
        'sign_token': handle_sign_token,
        'verify_token': handle_verify_token,
        'get_status': handle_get_status
    }
    
    handler = handlers.get(operation)
    if not handler:
        print(json.dumps({
            'success': False,
            'error_message': f'Unknown operation: {operation}'
        }))
        sys.exit(1)
    
    try:
        result = await handler(params)
        print(json.dumps(result))
    except Exception as e:
        logger.error(f"Handler execution failed: {e}")
        print(json.dumps({
            'success': False,
            'error_message': f'Handler execution failed: {str(e)}'
        }))
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main())
