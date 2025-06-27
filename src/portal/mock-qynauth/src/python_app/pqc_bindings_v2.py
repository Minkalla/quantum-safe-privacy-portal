import ctypes
from ctypes import c_int, c_char_p, c_void_p, c_size_t, POINTER, Structure, c_uint64
from pathlib import Path
import os
from contextlib import contextmanager
from typing import Tuple, Optional

class FFIErrorCode:
    SUCCESS = 0
    INVALID_INPUT = -1
    ALLOCATION_FAILED = -2
    CRYPTO_ERROR = -3
    BUFFER_TOO_SMALL = -4
    NULL_POINTER = -5
    INVALID_KEY_FORMAT = -6
    SIGNATURE_VERIFICATION_FAILED = -7

class PQCError(Exception):
    """Base exception for PQC operations"""
    pass

class CMLKEMKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

class CMLDSAKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

class PQCLibraryV2:
    """Enhanced Python interface for the Rust PQC library using C-compatible FFI."""
    
    def __init__(self, lib_path: Optional[str] = None):
        if lib_path is None:
            lib_path = self._find_library_path()
        
        if not os.path.exists(lib_path):
            raise PQCError(f"Library not found at {lib_path}")
        
        try:
            self.lib = ctypes.CDLL(lib_path)
        except OSError as e:
            raise PQCError(f"Failed to load library: {e}")
        
        self._setup_function_signatures()
    
    def _find_library_path(self) -> str:
        possible_paths = [
            "./target/release/libqynauth_pqc.so",
            "../rust_lib/target/release/libqynauth_pqc.so",
            "../../rust_lib/target/release/libqynauth_pqc.so",
            "./target/release/libqynauth_pqc.dylib",
            "../rust_lib/target/release/libqynauth_pqc.dylib",
            "./target/release/qynauth_pqc.dll",
            "../rust_lib/target/release/qynauth_pqc.dll",
        ]
        
        current_dir = Path(__file__).parent
        for path in possible_paths:
            full_path = current_dir / path
            if full_path.exists():
                return str(full_path)
        
        raise PQCError("Could not find PQC library. Please build the Rust library first.")
    
    def _setup_function_signatures(self):
        self.lib.mlkem_keypair_generate.argtypes = []
        self.lib.mlkem_keypair_generate.restype = POINTER(CMLKEMKeyPair)
        
        self.lib.mlkem_encapsulate.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        self.lib.mlkem_encapsulate.restype = c_int
        
        self.lib.mlkem_decapsulate.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        self.lib.mlkem_decapsulate.restype = c_int
        
        self.lib.mlkem_keypair_free.argtypes = [POINTER(CMLKEMKeyPair)]
        self.lib.mlkem_keypair_free.restype = None
        
        self.lib.mldsa_keypair_generate.argtypes = []
        self.lib.mldsa_keypair_generate.restype = POINTER(CMLDSAKeyPair)
        
        self.lib.mldsa_sign.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        self.lib.mldsa_sign.restype = c_int
        
        self.lib.mldsa_verify.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t
        ]
        self.lib.mldsa_verify.restype = c_int
        
        self.lib.mldsa_keypair_free.argtypes = [POINTER(CMLDSAKeyPair)]
        self.lib.mldsa_keypair_free.restype = None
        
        self.lib.ffi_buffer_free.argtypes = [POINTER(ctypes.c_uint8), c_size_t]
        self.lib.ffi_buffer_free.restype = None
        
        self.lib.ffi_get_operation_counts.argtypes = [
            POINTER(c_uint64), POINTER(c_uint64), POINTER(c_uint64)
        ]
        self.lib.ffi_get_operation_counts.restype = c_int
        
        self.lib.ffi_get_avg_operation_times.argtypes = [
            POINTER(c_uint64), POINTER(c_uint64)
        ]
        self.lib.ffi_get_avg_operation_times.restype = c_int

class MLKEMKeyPair:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib
        self._keypair_ptr = lib.lib.mlkem_keypair_generate()
        if not self._keypair_ptr:
            raise PQCError("Failed to generate ML-KEM keypair")
    
    def __del__(self):
        if hasattr(self, '_keypair_ptr') and self._keypair_ptr:
            self.lib.lib.mlkem_keypair_free(self._keypair_ptr)
    
    def get_public_key(self) -> bytes:
        """Get the public key as bytes."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        keypair = self._keypair_ptr.contents
        return ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)
    
    def encapsulate(self) -> Tuple[bytes, bytes]:
        """Perform encapsulation and return (ciphertext, shared_secret)."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        ciphertext_ptr = POINTER(ctypes.c_uint8)()
        ciphertext_len = c_size_t()
        
        result = self.lib.lib.mlkem_encapsulate(
            self._keypair_ptr.contents.public_key_ptr,
            self._keypair_ptr.contents.public_key_len,
            ctypes.byref(shared_secret_ptr),
            ctypes.byref(shared_secret_len),
            ctypes.byref(ciphertext_ptr),
            ctypes.byref(ciphertext_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            raise PQCError(f"Encapsulation failed with error code: {result}")
        
        try:
            shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
            ciphertext = ctypes.string_at(ciphertext_ptr, ciphertext_len.value)
            return ciphertext, shared_secret
        finally:
            self.lib.lib.ffi_buffer_free(shared_secret_ptr, shared_secret_len)
            self.lib.lib.ffi_buffer_free(ciphertext_ptr, ciphertext_len)
    
    def decapsulate(self, ciphertext: bytes) -> bytes:
        """Perform decapsulation and return shared secret."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        ciphertext_array = (ctypes.c_uint8 * len(ciphertext)).from_buffer_copy(ciphertext)
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        
        result = self.lib.lib.mlkem_decapsulate(
            self._keypair_ptr.contents.secret_key_ptr,
            self._keypair_ptr.contents.secret_key_len,
            ctypes.cast(ciphertext_array, POINTER(ctypes.c_uint8)),
            len(ciphertext),
            ctypes.byref(shared_secret_ptr),
            ctypes.byref(shared_secret_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            raise PQCError(f"Decapsulation failed with error code: {result}")
        
        try:
            shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
            return shared_secret
        finally:
            self.lib.lib.ffi_buffer_free(shared_secret_ptr, shared_secret_len)

class MLDSAKeyPair:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib
        self._keypair_ptr = lib.lib.mldsa_keypair_generate()
        if not self._keypair_ptr:
            raise PQCError("Failed to generate ML-DSA keypair")
    
    def __del__(self):
        if hasattr(self, '_keypair_ptr') and self._keypair_ptr:
            self.lib.lib.mldsa_keypair_free(self._keypair_ptr)
    
    def get_public_key(self) -> bytes:
        """Get the public key as bytes."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        keypair = self._keypair_ptr.contents
        return ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)
    
    def sign(self, message: bytes) -> bytes:
        """Sign a message and return the signature."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        message_array = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        signature_ptr = POINTER(ctypes.c_uint8)()
        signature_len = c_size_t()
        
        result = self.lib.lib.mldsa_sign(
            self._keypair_ptr.contents.secret_key_ptr,
            self._keypair_ptr.contents.secret_key_len,
            ctypes.cast(message_array, POINTER(ctypes.c_uint8)),
            len(message),
            ctypes.byref(signature_ptr),
            ctypes.byref(signature_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            raise PQCError(f"Signing failed with error code: {result}")
        
        try:
            signature = ctypes.string_at(signature_ptr, signature_len.value)
            return signature
        finally:
            self.lib.lib.ffi_buffer_free(signature_ptr, signature_len)
    
    def verify(self, message: bytes, signature: bytes) -> bool:
        """Verify a signature against a message."""
        if not self._keypair_ptr:
            raise PQCError("Keypair has been freed")
        
        message_array = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        signature_array = (ctypes.c_uint8 * len(signature)).from_buffer_copy(signature)
        
        result = self.lib.lib.mldsa_verify(
            self._keypair_ptr.contents.public_key_ptr,
            self._keypair_ptr.contents.public_key_len,
            ctypes.cast(message_array, POINTER(ctypes.c_uint8)),
            len(message),
            ctypes.cast(signature_array, POINTER(ctypes.c_uint8)),
            len(signature)
        )
        
        return result == FFIErrorCode.SUCCESS

class PerformanceMonitor:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib
    
    def get_operation_counts(self) -> Tuple[int, int, int]:
        """Get operation counts for (mlkem_keygen, mldsa_sign, mldsa_verify)."""
        mlkem_count = c_uint64()
        mldsa_sign_count = c_uint64()
        mldsa_verify_count = c_uint64()
        
        result = self.lib.lib.ffi_get_operation_counts(
            ctypes.byref(mlkem_count),
            ctypes.byref(mldsa_sign_count),
            ctypes.byref(mldsa_verify_count)
        )
        
        if result != 0:
            raise PQCError("Failed to get operation counts")
        
        return (mlkem_count.value, mldsa_sign_count.value, mldsa_verify_count.value)
    
    def get_avg_operation_times(self) -> Tuple[float, float]:
        """Get average operation times in nanoseconds for (mlkem_keygen, mldsa_sign)."""
        mlkem_time = c_uint64()
        mldsa_time = c_uint64()
        
        result = self.lib.lib.ffi_get_avg_operation_times(
            ctypes.byref(mlkem_time),
            ctypes.byref(mldsa_time)
        )
        
        if result != 0:
            raise PQCError("Failed to get average operation times")
        
        return (mlkem_time.value / 1e9, mldsa_time.value / 1e9)

@contextmanager
def secure_buffer(lib: PQCLibraryV2, size: int):
    """Context manager for secure buffer allocation"""
    buffer_ptr = None
    try:
        yield buffer_ptr
    finally:
        if buffer_ptr:
            lib.lib.ffi_buffer_free(buffer_ptr, size)

def get_last_error(lib: PQCLibraryV2) -> Optional[str]:
    """Get the last FFI error message"""
    error_ptr = lib.lib.ffi_get_last_error_message()
    if error_ptr:
        return ctypes.string_at(error_ptr).decode('utf-8')
    return None

if __name__ == "__main__":
    try:
        lib = PQCLibraryV2()
        print("PQC Library V2 loaded successfully")
        
        print("\n=== ML-KEM-768 Test ===")
        mlkem_keypair = MLKEMKeyPair(lib)
        print(f"Generated ML-KEM keypair, public key size: {len(mlkem_keypair.get_public_key())} bytes")
        
        ciphertext, shared_secret = mlkem_keypair.encapsulate()
        print(f"Encapsulation: ciphertext={len(ciphertext)} bytes, shared_secret={len(shared_secret)} bytes")
        
        decap_shared_secret = mlkem_keypair.decapsulate(ciphertext)
        print(f"Decapsulation successful: {shared_secret == decap_shared_secret}")
        
        print("\n=== ML-DSA-65 Test ===")
        mldsa_keypair = MLDSAKeyPair(lib)
        print(f"Generated ML-DSA keypair, public key size: {len(mldsa_keypair.get_public_key())} bytes")
        
        message = b"Hello, Post-Quantum World!"
        signature = mldsa_keypair.sign(message)
        print(f"Signed message, signature size: {len(signature)} bytes")
        
        is_valid = mldsa_keypair.verify(message, signature)
        print(f"Signature verification: {is_valid}")
        
        invalid_signature = mldsa_keypair.verify(b"Different message", signature)
        print(f"Invalid signature verification: {invalid_signature}")
        
        print("\n=== Performance Monitoring ===")
        monitor = PerformanceMonitor(lib)
        counts = monitor.get_operation_counts()
        times = monitor.get_avg_operation_times()
        print(f"Operation counts - ML-KEM keygen: {counts[0]}, ML-DSA sign: {counts[1]}, ML-DSA verify: {counts[2]}")
        print(f"Average times - ML-KEM keygen: {times[0]:.6f}s, ML-DSA sign: {times[1]:.6f}s")
        
    except PQCError as e:
        print(f"PQC Error: {e}")
        error_msg = get_last_error(lib) if 'lib' in locals() else None
        if error_msg:
            print(f"Last error: {error_msg}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
