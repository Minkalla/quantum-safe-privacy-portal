import ctypes
from ctypes import POINTER, c_char_p, c_uint8, c_size_t, c_bool, c_ulong
from typing import Tuple, Optional, Dict, Any, Union
import json
import logging
import os
from pathlib import Path

CUint8Ptr = ctypes.POINTER(c_uint8)

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
        self.lib.pqc_ml_kem_768_keygen.restype = c_char_p
        
        self.lib.pqc_ml_kem_768_encaps.argtypes = [POINTER(c_uint8), c_size_t]
        self.lib.pqc_ml_kem_768_encaps.restype = c_char_p
        
        self.lib.pqc_ml_kem_768_decaps.argtypes = [POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t]
        self.lib.pqc_ml_kem_768_decaps.restype = c_char_p
        
        self.lib.pqc_ml_dsa_65_keygen.argtypes = []
        self.lib.pqc_ml_dsa_65_keygen.restype = c_char_p
        
        self.lib.pqc_ml_dsa_65_sign.argtypes = [POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t]
        self.lib.pqc_ml_dsa_65_sign.restype = c_char_p
        
        self.lib.pqc_ml_dsa_65_verify.argtypes = [POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t, POINTER(c_uint8), c_size_t]
        self.lib.pqc_ml_dsa_65_verify.restype = c_bool
        
        self.lib.pqc_key_manager_create.argtypes = []
        self.lib.pqc_key_manager_create.restype = c_char_p
        
        self.lib.pqc_key_manager_generate_key.argtypes = [c_ulong, c_char_p, c_char_p]
        self.lib.pqc_key_manager_generate_key.restype = c_char_p
        
        self.lib.pqc_key_manager_rotate_key.argtypes = [c_ulong, c_char_p]
        self.lib.pqc_key_manager_rotate_key.restype = c_char_p
        
        self.lib.free_string.argtypes = [c_char_p]
        self.lib.free_string.restype = None
    
    def _call_and_parse_json(self, func, *args) -> Dict[str, Any]:
        """Call a function and parse its JSON response."""
        try:
            result_ptr = func(*args)
            if not result_ptr:
                raise PQCLibraryError("Function returned null pointer")
            
            result_str = ctypes.string_at(result_ptr).decode('utf-8')
            self.lib.free_string(result_ptr)
            
            result_data = json.loads(result_str)
            
            if not result_data.get('success', False):
                error_msg = result_data.get('error', 'Unknown error')
                raise PQCLibraryError(f"PQC operation failed: {error_msg}")
            
            return result_data
        except json.JSONDecodeError as e:
            raise PQCLibraryError(f"Failed to parse JSON response: {e}")
        except Exception as e:
            raise PQCLibraryError(f"FFI call failed: {e}")
    
    def _bytes_to_c_array(self, data: bytes) -> Tuple[Any, int]:
        """Convert Python bytes to C array."""
        if not data:
            return None, 0
        
        array_type = c_uint8 * len(data)
        c_array = array_type(*data)
        return ctypes.cast(c_array, POINTER(c_uint8)), len(data)
    
    def generate_ml_kem_keypair(self) -> Tuple[bytes, bytes]:
        """
        Generate an ML-KEM-768 keypair.
        
        Returns:
            Tuple of (public_key, private_key) as bytes
        """
        logger.info("Generating ML-KEM-768 keypair")
        
        result = self._call_and_parse_json(self.lib.pqc_ml_kem_768_keygen)
        
        public_key = bytes(result['public_key'])
        private_key = bytes(result['private_key'])
        
        logger.info(f"Generated ML-KEM-768 keypair: pub_key={len(public_key)} bytes, priv_key={len(private_key)} bytes")
        return public_key, private_key
    
    def ml_kem_encapsulate(self, public_key: bytes) -> Tuple[bytes, bytes]:
        """
        Perform ML-KEM-768 encapsulation.
        
        Args:
            public_key: The public key as bytes
            
        Returns:
            Tuple of (ciphertext, shared_secret) as bytes
        """
        logger.info(f"Performing ML-KEM-768 encapsulation with public key of {len(public_key)} bytes")
        
        pub_key_ptr, pub_key_len = self._bytes_to_c_array(public_key)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_kem_768_encaps,
            pub_key_ptr, pub_key_len
        )
        
        ciphertext = bytes(result['ciphertext'])
        shared_secret = bytes(result['shared_secret'])
        
        logger.info(f"ML-KEM-768 encapsulation successful: ciphertext={len(ciphertext)} bytes, shared_secret={len(shared_secret)} bytes")
        return ciphertext, shared_secret
    
    def ml_kem_decapsulate(self, private_key: bytes, ciphertext: bytes) -> bytes:
        """
        Perform ML-KEM-768 decapsulation.
        
        Args:
            private_key: The private key as bytes
            ciphertext: The ciphertext as bytes
            
        Returns:
            The shared secret as bytes
        """
        logger.info(f"Performing ML-KEM-768 decapsulation with private key of {len(private_key)} bytes and ciphertext of {len(ciphertext)} bytes")
        
        priv_key_ptr, priv_key_len = self._bytes_to_c_array(private_key)
        ciphertext_ptr, ciphertext_len = self._bytes_to_c_array(ciphertext)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_kem_768_decaps,
            priv_key_ptr, priv_key_len,
            ciphertext_ptr, ciphertext_len
        )
        
        shared_secret = bytes(result['shared_secret'])
        
        logger.info(f"ML-KEM-768 decapsulation successful: shared_secret={len(shared_secret)} bytes")
        return shared_secret
    
    def generate_ml_dsa_keypair(self) -> Tuple[bytes, bytes]:
        """
        Generate an ML-DSA-65 keypair.
        
        Returns:
            Tuple of (public_key, private_key) as bytes
        """
        logger.info("Generating ML-DSA-65 keypair")
        
        result = self._call_and_parse_json(self.lib.pqc_ml_dsa_65_keygen)
        
        public_key = bytes(result['public_key'])
        private_key = bytes(result['private_key'])
        
        logger.info(f"Generated ML-DSA-65 keypair: pub_key={len(public_key)} bytes, priv_key={len(private_key)} bytes")
        return public_key, private_key
    
    def ml_dsa_sign(self, private_key: bytes, message: bytes) -> bytes:
        """
        Sign a message using ML-DSA-65.
        
        Args:
            private_key: The private key as bytes
            message: The message to sign as bytes
            
        Returns:
            The signature as bytes
        """
        logger.info(f"Signing message of {len(message)} bytes with ML-DSA-65")
        
        message_ptr, message_len = self._bytes_to_c_array(message)
        priv_key_ptr, priv_key_len = self._bytes_to_c_array(private_key)
        
        result = self._call_and_parse_json(
            self.lib.pqc_ml_dsa_65_sign,
            message_ptr, message_len,
            priv_key_ptr, priv_key_len
        )
        
        signature = bytes(result['signature'])
        
        logger.info(f"ML-DSA-65 signing successful: signature={len(signature)} bytes")
        return signature
    
    def ml_dsa_verify(self, public_key: bytes, message: bytes, signature: bytes) -> bool:
        """
        Verify a signature using ML-DSA-65.
        
        Args:
            public_key: The public key as bytes
            message: The original message as bytes
            signature: The signature to verify as bytes
            
        Returns:
            True if signature is valid, False otherwise
        """
        logger.info(f"Verifying ML-DSA-65 signature of {len(signature)} bytes for message of {len(message)} bytes")
        
        signature_ptr, signature_len = self._bytes_to_c_array(signature)
        message_ptr, message_len = self._bytes_to_c_array(message)
        pub_key_ptr, pub_key_len = self._bytes_to_c_array(public_key)
        
        try:
            is_valid = self.lib.pqc_ml_dsa_65_verify(
                signature_ptr, signature_len,
                message_ptr, message_len,
                pub_key_ptr, pub_key_len
            )
            
            logger.info(f"ML-DSA-65 signature verification: {'VALID' if is_valid else 'INVALID'}")
            return bool(is_valid)
        except Exception as e:
            logger.error(f"ML-DSA-65 verification failed: {e}")
            return False
    
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
            
            public_key, private_key = self.generate_ml_kem_keypair()
            
            ciphertext, shared_secret1 = self.ml_kem_encapsulate(public_key)
            
            shared_secret2 = self.ml_kem_decapsulate(private_key, ciphertext)
            
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
            
            public_key, private_key = self.generate_ml_dsa_keypair()
            
            message = b"Test message for ML-DSA signature verification"
            signature = self.ml_dsa_sign(private_key, message)
            
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

def generate_pqc_keypairs() -> Dict[str, Tuple[bytes, bytes]]:
    """Generate both ML-KEM and ML-DSA keypairs."""
    lib = get_pqc_library()
    return {
        'ml_kem': lib.generate_ml_kem_keypair(),
        'ml_dsa': lib.generate_ml_dsa_keypair(),
    }

def sign_and_verify_message(message: bytes) -> bool:
    """Quick test: generate keys, sign message, and verify signature."""
    lib = get_pqc_library()
    public_key, private_key = lib.generate_ml_dsa_keypair()
    signature = lib.ml_dsa_sign(private_key, message)
    return lib.ml_dsa_verify(public_key, message, signature)

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
