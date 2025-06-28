import ctypes
from ctypes import c_int, c_char_p, c_void_p, c_size_t, POINTER, Structure
from pathlib import Path
import os
import sys
from contextlib import contextmanager

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

class CDilithiumKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

lib.dilithium_keypair_generate.restype = POINTER(CDilithiumKeyPair)
lib.dilithium_keypair_generate.argtypes = []

lib.dilithium_sign.restype = c_int
lib.dilithium_sign.argtypes = [
    POINTER(ctypes.c_uint8), c_size_t,  # secret_key_ptr, secret_key_len
    POINTER(ctypes.c_uint8), c_size_t,  # message_ptr, message_len
    POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),  # signature_out, signature_len_out
]

lib.dilithium_verify.restype = c_int
lib.dilithium_verify.argtypes = [
    POINTER(ctypes.c_uint8), c_size_t,  # public_key_ptr, public_key_len
    POINTER(ctypes.c_uint8), c_size_t,  # message_ptr, message_len
    POINTER(ctypes.c_uint8), c_size_t,  # signature_ptr, signature_len
]

lib.dilithium_keypair_free.restype = None
lib.dilithium_keypair_free.argtypes = [POINTER(CDilithiumKeyPair)]

lib.dilithium_buffer_free.restype = None
lib.dilithium_buffer_free.argtypes = [POINTER(ctypes.c_uint8), c_size_t]

lib.dilithium_get_last_error.restype = c_char_p
lib.dilithium_get_last_error.argtypes = []

lib.ffi_get_last_error_message.restype = c_char_p
lib.ffi_get_last_error_message.argtypes = []

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
    """High-level Python interface for Dilithium ML-DSA-65 operations"""
    
    def __init__(self):
        """Generate a new Dilithium key pair"""
        self._keypair_ptr = lib.dilithium_keypair_generate()
        if not self._keypair_ptr:
            error_msg = lib.dilithium_get_last_error()
            if error_msg:
                raise DilithiumError(f"Key generation failed: {error_msg.decode('utf-8')}")
            else:
                raise DilithiumError("Key generation failed: Unknown error")
        
        keypair = self._keypair_ptr.contents
        self.public_key = ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)
        self._secret_key = ctypes.string_at(keypair.secret_key_ptr, keypair.secret_key_len)
    
    def __del__(self):
        """Clean up the key pair"""
        if hasattr(self, '_keypair_ptr') and self._keypair_ptr:
            lib.dilithium_keypair_free(self._keypair_ptr)
            self._keypair_ptr = None
    
    def sign(self, message: bytes) -> bytes:
        """
        Sign a message with the secret key
        Args: message: bytes to sign
        Returns: signature: bytes
        """
        if not self._keypair_ptr:
            raise DilithiumError("Key pair has been freed")
        
        keypair = self._keypair_ptr.contents
        message_ptr = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        signature_ptr = POINTER(ctypes.c_uint8)()
        signature_len = c_size_t()
        
        result = lib.dilithium_sign(
            keypair.secret_key_ptr, keypair.secret_key_len,
            ctypes.cast(message_ptr, POINTER(ctypes.c_uint8)), len(message),
            ctypes.byref(signature_ptr), ctypes.byref(signature_len)
        )
        
        if result != 0:
            error_msg = lib.dilithium_get_last_error()
            if error_msg:
                raise DilithiumError(f"Signing failed: {error_msg.decode('utf-8')}")
            else:
                raise DilithiumError(f"Signing failed with error code: {result}")
        
        try:
            signature = ctypes.string_at(signature_ptr, signature_len.value)
            return signature
        finally:
            lib.dilithium_buffer_free(signature_ptr, signature_len.value)
    
    def verify(self, message: bytes, signature: bytes) -> bool:
        """
        Verify a signature against a message using the public key
        Args: message: bytes, signature: bytes
        Returns: bool indicating if signature is valid
        """
        if not self._keypair_ptr:
            raise DilithiumError("Key pair has been freed")
        
        keypair = self._keypair_ptr.contents
        message_ptr = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        signature_ptr = (ctypes.c_uint8 * len(signature)).from_buffer_copy(signature)
        
        result = lib.dilithium_verify(
            keypair.public_key_ptr, keypair.public_key_len,
            ctypes.cast(message_ptr, POINTER(ctypes.c_uint8)), len(message),
            ctypes.cast(signature_ptr, POINTER(ctypes.c_uint8)), len(signature)
        )
        
        if result == 0:
            return True
        elif result == -7:  # FFIErrorCode::SignatureVerificationFailed
            return False
        else:
            error_msg = lib.dilithium_get_last_error()
            if error_msg:
                raise DilithiumError(f"Verification failed: {error_msg.decode('utf-8')}")
            else:
                raise DilithiumError(f"Verification failed with error code: {result}")

def generate_kyber_keypair():
    """Generate a new Kyber key pair"""
    return KyberKeyPair()

def generate_dilithium_keypair():
    """Generate a new Dilithium key pair"""
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
    """Demonstrate Dilithium signature operations"""
    try:
        dp = DilithiumKeyPair()
        message = b"Hello, Quantum-Safe World!"
        signature = dp.sign(message)
        is_valid = dp.verify(message, signature)
        
        return {
            'success': True,
            'public_key_len': len(dp.public_key),
            'signature_len': len(signature),
            'message': message.decode('utf-8'),
            'signature_valid': is_valid
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@contextmanager
def secure_buffer(size: int):
    """
    Context manager for secure buffer allocation
    
    Args:
        size: Size of buffer to allocate in bytes
        
    Yields:
        ctypes array that can be used for secure operations
        
    The buffer is automatically zeroed when the context exits
    """
    if size <= 0:
        raise ValueError("Buffer size must be positive")
    
    buffer = (ctypes.c_uint8 * size)()
    try:
        yield buffer
    finally:
        ctypes.memset(buffer, 0, size)

def get_last_error() -> str:
    """
    Get the last FFI error message from the global error state
    
    Returns:
        str: Last error message, or empty string if no error
    """
    try:
        error_ptr = lib.ffi_get_last_error_message()
        if error_ptr:
            return error_ptr.decode('utf-8')
        return ""
    except Exception:
        return "Failed to retrieve error message"

def get_kyber_last_error() -> str:
    """
    Get the last Kyber-specific error message
    
    Returns:
        str: Last Kyber error message, or empty string if no error
    """
    try:
        error_ptr = lib.kyber_get_last_error()
        if error_ptr:
            return error_ptr.decode('utf-8')
        return ""
    except Exception:
        return "Failed to retrieve Kyber error message"

def get_dilithium_last_error() -> str:
    """
    Get the last Dilithium-specific error message
    
    Returns:
        str: Last Dilithium error message, or empty string if no error
    """
    try:
        error_ptr = lib.dilithium_get_last_error()
        if error_ptr:
            return error_ptr.decode('utf-8')
        return ""
    except Exception:
        return "Failed to retrieve Dilithium error message"

@contextmanager
def kyber_keypair_context():
    """
    Context manager for Kyber key pair operations
    
    Yields:
        KyberKeyPair: A Kyber key pair that is automatically cleaned up
    """
    keypair = None
    try:
        keypair = KyberKeyPair()
        yield keypair
    finally:
        if keypair:
            del keypair

@contextmanager
def dilithium_keypair_context():
    """
    Context manager for Dilithium key pair operations
    
    Yields:
        DilithiumKeyPair: A Dilithium key pair that is automatically cleaned up
    """
    keypair = None
    try:
        keypair = DilithiumKeyPair()
        yield keypair
    finally:
        if keypair:
            del keypair

def safe_bytes_to_ctypes(data: bytes) -> ctypes.Array:
    """
    Safely convert bytes to ctypes array
    
    Args:
        data: Bytes to convert
        
    Returns:
        ctypes array containing the data
    """
    if not isinstance(data, bytes):
        raise TypeError("Input must be bytes")
    
    return (ctypes.c_uint8 * len(data)).from_buffer_copy(data)

def validate_key_sizes():
    """
    Validate that the FFI library returns expected key sizes
    
    Returns:
        dict: Validation results with key sizes
    """
    try:
        with kyber_keypair_context() as kp:
            kyber_public_key_len = len(kp.public_key)
        
        with dilithium_keypair_context() as dp:
            dilithium_public_key_len = len(dp.public_key)
        
        return {
            'success': True,
            'kyber_public_key_len': kyber_public_key_len,
            'kyber_expected': 1184,  # ML-KEM-768
            'kyber_valid': kyber_public_key_len == 1184,
            'dilithium_public_key_len': dilithium_public_key_len,
            'dilithium_expected': 1952,  # ML-DSA-65
            'dilithium_valid': dilithium_public_key_len == 1952
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
