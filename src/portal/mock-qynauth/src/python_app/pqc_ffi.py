import ctypes
from ctypes import c_char_p, c_uint8, c_size_t, c_bool, POINTER
from typing import Optional, Dict, Any, Tuple
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class PQCLibraryError(Exception):
    """Exception raised for PQC library errors."""
    pass

class PQCLibrary:
    """Python interface for the Rust PQC library using ctypes FFI."""
    
    def __init__(self, lib_path: Optional[str] = None):
        """
        Initialize the PQC library interface.
        
        Args:
            lib_path: Path to the shared library. If None, will try to find it automatically.
        """
        if lib_path is None:
            lib_path = self._find_library_path()
        
        if not os.path.exists(lib_path):
            raise PQCLibraryError(f"Library not found at {lib_path}")
        
        try:
            self.lib = ctypes.CDLL(lib_path)
            logger.info(f"Successfully loaded PQC library from {lib_path}")
        except OSError as e:
            raise PQCLibraryError(f"Failed to load library: {e}")
        
        self._setup_function_signatures()
    
    def _find_library_path(self) -> str:
        """Find the PQC library automatically."""
        possible_paths = [
            "./target/release/libqynauth_pqc.so",
            "../rust_lib/target/release/libqynauth_pqc.so",
            "../../rust_lib/target/release/libqynauth_pqc.so",
            "./target/release/libqynauth_pqc.dylib",  # macOS
            "../rust_lib/target/release/libqynauth_pqc.dylib",
            "./target/release/qynauth_pqc.dll",  # Windows
            "../rust_lib/target/release/qynauth_pqc.dll",
        ]
        
        current_dir = Path(__file__).parent
        for path in possible_paths:
            full_path = current_dir / path
            if full_path.exists():
                return str(full_path)
        
        raise PQCLibraryError("Could not find PQC library. Please build the Rust library first.")
    
    def _setup_function_signatures(self):
        """Set up function signatures for all FFI functions."""
        
        self.lib.pqc_ml_kem_768_keygen.argtypes = []
        self.lib.pqc_ml_kem_768_keygen.restype = ctypes.c_void_p
        
        self.lib.pqc_ml_kem_768_encaps.argtypes = [
            ctypes.POINTER(c_uint8), c_size_t  # public_key, public_key_len
        ]
        self.lib.pqc_ml_kem_768_encaps.restype = ctypes.c_void_p
        
        self.lib.pqc_ml_kem_768_decaps.argtypes = [
            ctypes.POINTER(c_uint8), c_size_t,  # secret_key, secret_key_len
            ctypes.POINTER(c_uint8), c_size_t   # ciphertext, ciphertext_len
        ]
        self.lib.pqc_ml_kem_768_decaps.restype = ctypes.c_void_p
        
        self.lib.pqc_ml_dsa_65_keygen.argtypes = []
        self.lib.pqc_ml_dsa_65_keygen.restype = ctypes.c_void_p
        
        self.lib.pqc_ml_dsa_65_sign.argtypes = [
            ctypes.POINTER(c_uint8), c_size_t,  # message, message_len
            ctypes.POINTER(c_uint8), c_size_t   # private_key, private_key_len
        ]
        self.lib.pqc_ml_dsa_65_sign.restype = ctypes.c_void_p
        
        self.lib.pqc_ml_dsa_65_verify.argtypes = [
            ctypes.POINTER(c_uint8), c_size_t,  # signature, signature_len
            ctypes.POINTER(c_uint8), c_size_t,  # message, message_len
            ctypes.POINTER(c_uint8), c_size_t   # public_key, public_key_len
        ]
        self.lib.pqc_ml_dsa_65_verify.restype = c_bool
        
        self.lib.pqc_key_manager_create.argtypes = []
        self.lib.pqc_key_manager_create.restype = c_char_p
        
        self.lib.pqc_key_manager_generate_key.argtypes = [c_size_t, c_char_p, c_char_p]
        self.lib.pqc_key_manager_generate_key.restype = c_char_p
        
        self.lib.pqc_key_manager_rotate_key.argtypes = [c_size_t, c_char_p]
        self.lib.pqc_key_manager_rotate_key.restype = c_char_p
        
        if hasattr(self.lib, 'free_string'):
            self.lib.free_string.argtypes = [ctypes.c_void_p]
            self.lib.free_string.restype = None
    
    def _call_and_parse_json(self, func, *args) -> Dict[str, Any]:
        """Battle-hardened FFI call with segfault immunity and resilient cleanup."""
        ptr = None
        function_name = getattr(func, '__name__', 'unknown_function')
        
        try:
            logger.info(f"🚀 Calling FFI function: {function_name}")
            ptr = func(*args)
            
            if not ptr:
                raise RuntimeError(f"❌ Null pointer returned from {function_name}")

            raw_bytes = ctypes.cast(ptr, ctypes.c_char_p).value
            if raw_bytes is None:
                raise RuntimeError("❌ Received null bytes from pointer")

            json_str = raw_bytes.decode('utf-8')
            logger.debug(f"🔍 Decoded JSON string: {json_str}")

            result = json.loads(json_str)
        
            # Validate JSON response structure
            if not isinstance(result, dict):
                raise RuntimeError(f"Invalid JSON response format: expected dict, got {type(result)}")
        
            if not result.get('success', False):
                error_msg = result.get('error', 'Unknown PQC operation error')
                raise PQCLibraryError(f"PQC operation failed: {error_msg}")
        
            logger.info(f"✅ JSON parsed successfully for {function_name}")
            return result

        except Exception as e:
            logger.error(f"💥 Exception during FFI call to {function_name}: {e}", exc_info=True)
            raise

        finally:
            if ptr:
                try:
                    self.lib.free_string(ptr)
                    logger.debug(f"🧹 Freed pointer successfully: {ptr}")
                except Exception as cleanup_error:
                    logger.warning(f"⚠️ Error freeing pointer: {cleanup_error}", exc_info=True)
    
    def _bytes_to_c_array(self, data: bytes) -> Tuple[Any, int]:
        """Convert Python bytes to C array."""
        if not data:
            return None, 0
        
        array_type = c_uint8 * len(data)
        c_array = array_type(*data)
        return ctypes.cast(c_array, ctypes.POINTER(c_uint8)), len(data)
    
    def generate_ml_kem_keypair(self) -> Dict[str, Any]:
        """
        Generate an ML-KEM-768 keypair using JSON-based interface.
        
        Returns:
            Dictionary with public_key, private_key, and algorithm
        """
        logger.info("Generating ML-KEM-768 keypair")
        
        result = self._call_and_parse_json(self.lib.pqc_ml_kem_768_keygen)
        
        logger.info(f"Generated ML-KEM-768 keypair: pub_key={len(result['public_key'])} bytes, priv_key={len(result['private_key'])} bytes")
        return {
            'public_key': result['public_key'],
            'private_key': result['private_key'],
            'algorithm': result.get('algorithm', 'ML-KEM-768')
        }
    
    def ml_kem_encapsulate(self, public_key: Any = None) -> Dict[str, Any]:
        """
        Perform ML-KEM-768 encapsulation.
        
        Args:
            public_key: The public key (can be None, will generate keypair if needed)
            
        Returns:
            Dictionary with ciphertext, shared_secret, and algorithm
        """
        logger.info("Starting ML-KEM-768 encapsulation")
        
        if public_key is None:
            keypair = self.generate_ml_kem_keypair()
            public_key_data = keypair['public_key']
        else:
            public_key_data = public_key if isinstance(public_key, list) else list(public_key)
        
        logger.debug(f"Using public key of length: {len(public_key_data)}")
        
        public_key_bytes = bytes(public_key_data)
        pub_key_ptr, pub_key_len = self._bytes_to_c_array(public_key_bytes)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_kem_768_encaps,
            pub_key_ptr, pub_key_len
        )
        
        logger.info("ML-KEM-768 encapsulation successful")
        
        return {
            'shared_secret': result['shared_secret'],
            'ciphertext': result['ciphertext'],
            'algorithm': result.get('algorithm', 'ML-KEM-768')
        }
    
    def ml_kem_decapsulate(self, private_key: Any, ciphertext: Any) -> Dict[str, Any]:
        """
        Perform ML-KEM-768 decapsulation.
        
        Args:
            private_key: The private key as bytes or list
            ciphertext: The ciphertext as bytes or list
            
        Returns:
            Dictionary with shared_secret
        """
        private_key_data = private_key if isinstance(private_key, list) else list(private_key)
        ciphertext_data = ciphertext if isinstance(ciphertext, list) else list(ciphertext)
        
        logger.info(f"Performing ML-KEM-768 decapsulation with private key of {len(private_key_data)} bytes and ciphertext of {len(ciphertext_data)} bytes")
        
        private_key_bytes = bytes(private_key_data)
        ciphertext_bytes = bytes(ciphertext_data)
        
        priv_key_ptr, priv_key_len = self._bytes_to_c_array(private_key_bytes)
        ciphertext_ptr, ciphertext_len = self._bytes_to_c_array(ciphertext_bytes)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_kem_768_decaps,
            priv_key_ptr, priv_key_len,
            ciphertext_ptr, ciphertext_len
        )
        
        logger.info("ML-KEM-768 decapsulation successful")
        
        return {
            'shared_secret': result['shared_secret']
        }
    
    def generate_ml_dsa_keypair(self) -> Dict[str, Any]:
        """
        Generate an ML-DSA-65 keypair.
        
        Returns:
            Dictionary with public_key, private_key, and algorithm
        """
        logger.info("Generating ML-DSA-65 keypair")
        
        result = self._call_and_parse_json(self.lib.pqc_ml_dsa_65_keygen)
        
        logger.info(f"Generated ML-DSA-65 keypair: pub_key={len(result['public_key'])} bytes, priv_key={len(result['private_key'])} bytes")
        return {
            'public_key': result['public_key'],
            'private_key': result['private_key'],
            'algorithm': result.get('algorithm', 'ML-DSA-65')
        }
    
    def ml_dsa_sign(self, private_key: Any, message: Any) -> Dict[str, Any]:
        """
        Sign a message using ML-DSA-65.
        
        Args:
            private_key: The private key as bytes or list
            message: The message to sign as bytes or list
            
        Returns:
            Dictionary with signature and algorithm
        """
        private_key_data = private_key if isinstance(private_key, list) else list(private_key)
        message_data = message if isinstance(message, (bytes, list)) else message.encode('utf-8')
        if isinstance(message_data, str):
            message_data = message_data.encode('utf-8')
        if isinstance(message_data, bytes):
            message_data = list(message_data)
        
        logger.info(f"Signing message of {len(message_data)} bytes with ML-DSA-65")
        
        private_key_bytes = bytes(private_key_data)
        message_bytes = bytes(message_data)
        
        message_ptr, message_len = self._bytes_to_c_array(message_bytes)
        priv_key_ptr, priv_key_len = self._bytes_to_c_array(private_key_bytes)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_dsa_65_sign,
            message_ptr, message_len,
            priv_key_ptr, priv_key_len
        )
        
        logger.info("ML-DSA-65 signing successful")
        
        return {
            'signature': result['signature'],
            'algorithm': result.get('algorithm', 'ML-DSA-65')
        }
    
    def ml_dsa_verify(self, public_key: Any, message: Any, signature: Any) -> bool:
        """
        Verify a signature using ML-DSA-65.
        
        Args:
            public_key: The public key as bytes or list
            message: The original message as bytes or list
            signature: The signature to verify as bytes or list
            
        Returns:
            True if signature is valid, False otherwise
        """
        public_key_data = public_key if isinstance(public_key, list) else list(public_key)
        signature_data = signature if isinstance(signature, list) else list(signature)
        message_data = message if isinstance(message, (bytes, list)) else message.encode('utf-8')
        if isinstance(message_data, str):
            message_data = message_data.encode('utf-8')
        if isinstance(message_data, bytes):
            message_data = list(message_data)
        
        logger.info(f"Verifying ML-DSA-65 signature of {len(signature_data)} bytes for message of {len(message_data)} bytes")
        
        public_key_bytes = bytes(public_key_data)
        message_bytes = bytes(message_data)
        signature_bytes = bytes(signature_data)
        
        signature_ptr, signature_len = self._bytes_to_c_array(signature_bytes)
        message_ptr, message_len = self._bytes_to_c_array(message_bytes)
        pub_key_ptr, pub_key_len = self._bytes_to_c_array(public_key_bytes)
        
        result = self.lib.pqc_ml_dsa_65_verify(
            signature_ptr, signature_len,
            message_ptr, message_len,
            pub_key_ptr, pub_key_len
        )
        
        logger.info(f"ML-DSA-65 signature verification: {'VALID' if result else 'INVALID'}")
        return bool(result)
    
    def create_key_manager(self) -> int:
        """
        Create a new key manager instance.
        
        Returns:
            Manager pointer as integer
        """
        logger.info("Creating new key manager instance")
        
        result = self._call_and_parse_json(self.lib.pqc_key_manager_create)
        manager_ptr = result['manager_ptr']
        
        logger.info(f"Created key manager with pointer: {manager_ptr}")
        return manager_ptr
    
    def generate_and_store_key(self, manager_ptr: int, user_id: str, algorithm: str) -> str:
        """
        Generate and store a key in the key manager.
        
        Args:
            manager_ptr: Key manager pointer
            user_id: User identifier
            algorithm: Algorithm name (e.g., "Kyber-768", "Dilithium-3")
            
        Returns:
            Generated key ID
        """
        logger.info(f"Generating {algorithm} key for user {user_id}")
        
        user_id_c = c_char_p(user_id.encode('utf-8'))
        algorithm_c = c_char_p(algorithm.encode('utf-8'))
        
        result = self._call_and_parse_json(
            self.lib.pqc_key_manager_generate_key,
            manager_ptr, user_id_c, algorithm_c
        )
        
        key_id = result['key_id']
        logger.info(f"Generated key {key_id} for user {user_id}")
        return key_id
    
    def rotate_key(self, manager_ptr: int, key_id: str) -> str:
        """
        Rotate a key in the key manager.
        
        Args:
            manager_ptr: Key manager pointer
            key_id: Key ID to rotate
            
        Returns:
            New key ID
        """
        logger.info(f"Rotating key {key_id}")
        
        key_id_c = c_char_p(key_id.encode('utf-8'))
        
        result = self._call_and_parse_json(
            self.lib.pqc_key_manager_rotate_key,
            manager_ptr, key_id_c
        )
        
        new_key_id = result['new_key_id']
        logger.info(f"Rotated key {key_id} to new key {new_key_id}")
        return new_key_id
    
    def test_ml_kem_roundtrip(self) -> bool:
        """Test ML-KEM key generation, encapsulation, and decapsulation."""
        try:
            logger.info("Testing ML-KEM roundtrip")
            
            keypair = self.generate_ml_kem_keypair()
            public_key = keypair['public_key']
            private_key = keypair['private_key']
            
            encaps_result = self.ml_kem_encapsulate(public_key)
            ciphertext = encaps_result['ciphertext']
            shared_secret1 = encaps_result['shared_secret']
            
            decaps_result = self.ml_kem_decapsulate(private_key, ciphertext)
            shared_secret2 = decaps_result['shared_secret']
            
            success = shared_secret1 == shared_secret2
            logger.info(f"ML-KEM roundtrip test: {'PASSED' if success else 'FAILED'}")
            return success
        except Exception as e:
            logger.error(f"ML-KEM roundtrip test failed: {e}")
            return False
    
    def test_ml_dsa_roundtrip(self) -> bool:
        """Test ML-DSA key generation, signing, and verification."""
        try:
            logger.info("Testing ML-DSA roundtrip")
            
            keypair = self.generate_ml_dsa_keypair()
            public_key = keypair['public_key']
            private_key = keypair['private_key']
            
            message = b"Test message for ML-DSA signature verification"
            sign_result = self.ml_dsa_sign(private_key, message)
            signature = sign_result['signature']
            
            is_valid = self.ml_dsa_verify(public_key, message, signature)
            
            logger.info(f"ML-DSA roundtrip test: {'PASSED' if is_valid else 'FAILED'}")
            return is_valid
        except Exception as e:
            logger.error(f"ML-DSA roundtrip test failed: {e}")
            return False
    
    def run_comprehensive_test(self) -> Dict[str, bool]:
        """Run comprehensive tests of all PQC operations."""
        logger.info("Running comprehensive PQC tests")
        
        results = {
            'ml_kem_roundtrip': self.test_ml_kem_roundtrip(),
            'ml_dsa_roundtrip': self.test_ml_dsa_roundtrip(),
        }
        
        try:
            manager_ptr = self.create_key_manager()
            key_id = self.generate_and_store_key(manager_ptr, "test_user", "Kyber-768")
            new_key_id = self.rotate_key(manager_ptr, key_id)
            results['key_management'] = True
            logger.info("Key management test: PASSED")
        except Exception as e:
            logger.error(f"Key management test failed: {e}")
            results['key_management'] = False
        
        all_passed = all(results.values())
        logger.info(f"Comprehensive test results: {results} - {'ALL PASSED' if all_passed else 'SOME FAILED'}")
        
        return results

_pqc_lib_instance = None

def get_pqc_library() -> PQCLibrary:
    """Get a global PQC library instance."""
    global _pqc_lib_instance
    if _pqc_lib_instance is None:
        _pqc_lib_instance = PQCLibrary()
    return _pqc_lib_instance

def generate_pqc_keypairs() -> Dict[str, Dict[str, Any]]:
    """Generate both ML-KEM and ML-DSA keypairs."""
    lib = get_pqc_library()
    return {
        'ml_kem': lib.generate_ml_kem_keypair(),
        'ml_dsa': lib.generate_ml_dsa_keypair(),
    }

def sign_and_verify_message(message: bytes) -> bool:
    """Quick test: generate keys, sign message, and verify signature."""
    lib = get_pqc_library()
    keypair = lib.generate_ml_dsa_keypair()
    sign_result = lib.ml_dsa_sign(keypair['private_key'], message)
    return lib.ml_dsa_verify(keypair['public_key'], message, sign_result['signature'])

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    try:
        lib = PQCLibrary()
        results = lib.run_comprehensive_test()
        
        print("\n=== PQC Library Test Results ===")
        for test_name, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{test_name}: {status}")
        
        if all(results.values()):
            print("\n🎉 All tests passed! PQC library is working correctly.")
        else:
            print("\n⚠️  Some tests failed. Check the logs for details.")
            
    except Exception as e:
        print(f"❌ Failed to initialize PQC library: {e}")
        print("Make sure the Rust library is built and available.")
