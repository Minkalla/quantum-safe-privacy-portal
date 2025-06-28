import ctypes
from ctypes import c_int, c_char_p, c_void_p, c_size_t, POINTER, Structure
from pathlib import Path
import os
import sys

class PQCError(Exception):
    """Base exception for PQC operations"""
    pass

class KyberError(PQCError):
    """Kyber-specific errors"""
    pass

class DilithiumError(PQCError):
    """Dilithium-specific errors"""
    pass

lib_path = Path(__file__).parent.parent / "rust_lib" / "target" / "debug"
if os.name == 'nt':
    lib_name = "qynauth_pqc.dll"
elif os.uname().sysname == 'Darwin':
    lib_name = "libqynauth_pqc.dylib"
else:
    lib_name = "libqynauth_pqc.so"

try:
    lib = ctypes.CDLL(str(lib_path / lib_name))
except OSError as e:
    raise PQCError(f"Failed to load PQC library: {e}")

class CKyberKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

lib.kyber_keypair_generate.restype = POINTER(CKyberKeyPair)
lib.kyber_keypair_generate.argtypes = []

lib.kyber_encapsulate.restype = c_int
lib.kyber_encapsulate.argtypes = [
    POINTER(ctypes.c_uint8), c_size_t,  # public_key_ptr, public_key_len
    POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),  # shared_secret_out, shared_secret_len_out
    POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),  # ciphertext_out, ciphertext_len_out
]

lib.kyber_decapsulate.restype = c_int
lib.kyber_decapsulate.argtypes = [
    POINTER(ctypes.c_uint8), c_size_t,  # secret_key_ptr, secret_key_len
    POINTER(ctypes.c_uint8), c_size_t,  # ciphertext_ptr, ciphertext_len
    POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),  # shared_secret_out, shared_secret_len_out
]

lib.kyber_keypair_free.restype = None
lib.kyber_keypair_free.argtypes = [POINTER(CKyberKeyPair)]

lib.kyber_buffer_free.restype = None
lib.kyber_buffer_free.argtypes = [POINTER(ctypes.c_uint8), c_size_t]

lib.kyber_get_last_error.restype = c_char_p
lib.kyber_get_last_error.argtypes = []

class KyberKeyPair:
    """High-level Python interface for Kyber ML-KEM-768 operations"""
    
    def __init__(self):
        """Generate a new Kyber key pair"""
        self._keypair_ptr = lib.kyber_keypair_generate()
        if not self._keypair_ptr:
            error_msg = lib.kyber_get_last_error()
            if error_msg:
                raise KyberError(f"Key generation failed: {error_msg.decode('utf-8')}")
            else:
                raise KyberError("Key generation failed: Unknown error")
        
        keypair = self._keypair_ptr.contents
        self.public_key = ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)
        self._secret_key = ctypes.string_at(keypair.secret_key_ptr, keypair.secret_key_len)
    
    def __del__(self):
        """Clean up the key pair"""
        if hasattr(self, '_keypair_ptr') and self._keypair_ptr:
            lib.kyber_keypair_free(self._keypair_ptr)
            self._keypair_ptr = None
    
    def encapsulate(self):
        """
        Perform key encapsulation
        Returns: (shared_secret: bytes, ciphertext: bytes)
        """
        if not self._keypair_ptr:
            raise KyberError("Key pair has been freed")
        
        keypair = self._keypair_ptr.contents
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        ciphertext_ptr = POINTER(ctypes.c_uint8)()
        ciphertext_len = c_size_t()
        
        result = lib.kyber_encapsulate(
            keypair.public_key_ptr, keypair.public_key_len,
            ctypes.byref(shared_secret_ptr), ctypes.byref(shared_secret_len),
            ctypes.byref(ciphertext_ptr), ctypes.byref(ciphertext_len)
        )
        
        if result != 0:
            error_msg = lib.kyber_get_last_error()
            if error_msg:
                raise KyberError(f"Encapsulation failed: {error_msg.decode('utf-8')}")
            else:
                raise KyberError(f"Encapsulation failed with error code: {result}")
        
        try:
            shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
            ciphertext = ctypes.string_at(ciphertext_ptr, ciphertext_len.value)
            return shared_secret, ciphertext
        finally:
            lib.kyber_buffer_free(shared_secret_ptr, shared_secret_len.value)
            lib.kyber_buffer_free(ciphertext_ptr, ciphertext_len.value)
    
    def decapsulate(self, ciphertext: bytes):
        """
        Perform key decapsulation
        Args: ciphertext: bytes
        Returns: shared_secret: bytes
        """
        if not self._keypair_ptr:
            raise KyberError("Key pair has been freed")
        
        keypair = self._keypair_ptr.contents
        ciphertext_ptr = (ctypes.c_uint8 * len(ciphertext)).from_buffer_copy(ciphertext)
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        
        result = lib.kyber_decapsulate(
            keypair.secret_key_ptr, keypair.secret_key_len,
            ctypes.cast(ciphertext_ptr, POINTER(ctypes.c_uint8)), len(ciphertext),
            ctypes.byref(shared_secret_ptr), ctypes.byref(shared_secret_len)
        )
        
        if result != 0:
            error_msg = lib.kyber_get_last_error()
            if error_msg:
                raise KyberError(f"Decapsulation failed: {error_msg.decode('utf-8')}")
            else:
                raise KyberError(f"Decapsulation failed with error code: {result}")
        
        try:
            shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
            return shared_secret
        finally:
            lib.kyber_buffer_free(shared_secret_ptr, shared_secret_len.value)

class DilithiumKeyPair:
    """Placeholder for Dilithium operations - to be implemented in WBS 2.3.2"""
    
    def __init__(self):
        raise DilithiumError("Dilithium FFI not yet implemented - coming in WBS 2.3.2")
    
    def sign(self, message: bytes) -> bytes:
        raise DilithiumError("Dilithium FFI not yet implemented - coming in WBS 2.3.2")
    
    def verify(self, message: bytes, signature: bytes) -> bool:
        raise DilithiumError("Dilithium FFI not yet implemented - coming in WBS 2.3.2")

def generate_kyber_keypair():
    """Generate a new Kyber key pair"""
    return KyberKeyPair()

def generate_dilithium_keypair():
    """Generate a new Dilithium key pair - placeholder"""
    return DilithiumKeyPair()

def kyber_kem_demo():
    """Demonstrate Kyber KEM operations"""
    try:
        kp = KyberKeyPair()
        shared_secret, ciphertext = kp.encapsulate()
        recovered_secret = kp.decapsulate(ciphertext)
        
        return {
            'success': True,
            'public_key_len': len(kp.public_key),
            'shared_secret_len': len(shared_secret),
            'ciphertext_len': len(ciphertext),
            'secrets_match': shared_secret == recovered_secret
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

def dilithium_signature_demo():
    """Demonstrate Dilithium signature operations - placeholder"""
    return {
        'success': False,
        'error': 'Dilithium FFI not yet implemented - coming in WBS 2.3.2'
    }
