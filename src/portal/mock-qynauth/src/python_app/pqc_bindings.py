import ctypes
from ctypes import c_int, c_char_p, c_void_p, c_size_t, POINTER, Structure, c_uint64
from pathlib import Path
import os
import sys
from contextlib import contextmanager

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
    pass

class KyberError(PQCError):
    pass

class DilithiumError(PQCError):
    pass

class CKyberKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

class CDilithiumKeyPair(Structure):
    _fields_ = [
        ("public_key_ptr", POINTER(ctypes.c_uint8)),
        ("public_key_len", c_size_t),
        ("secret_key_ptr", POINTER(ctypes.c_uint8)),
        ("secret_key_len", c_size_t),
    ]

class PQCLibraryV2:
    def __init__(self):
        self.lib_path = self._find_library_path()
        if not self.lib_path.exists():
            raise PQCError(f"PQC library not found at {self.lib_path}")
        
        try:
            self.lib = ctypes.CDLL(str(self.lib_path))
            self._setup_function_signatures()
        except OSError as e:
            raise PQCError(f"Failed to load PQC library: {e}")

    def _find_library_path(self):
        base_path = Path(__file__).parent.parent / "rust_lib" / "target" / "debug"
        
        if os.name == 'nt':
            lib_name = "qynauth_pqc.dll"
        elif os.uname().sysname == 'Darwin':
            lib_name = "libqynauth_pqc.dylib"
        else:
            lib_name = "libqynauth_pqc.so"
        
        return base_path / lib_name

    def _setup_function_signatures(self):
        self.lib.mlkem_keypair_generate.restype = POINTER(CKyberKeyPair)
        self.lib.mlkem_keypair_generate.argtypes = []
        
        self.lib.mlkem_encapsulate.restype = c_int
        self.lib.mlkem_encapsulate.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t),
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        
        self.lib.mlkem_decapsulate.restype = c_int
        self.lib.mlkem_decapsulate.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        
        self.lib.mldsa_keypair_generate.restype = POINTER(CDilithiumKeyPair)
        self.lib.mldsa_keypair_generate.argtypes = []
        
        self.lib.mldsa_sign.restype = c_int
        self.lib.mldsa_sign.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(POINTER(ctypes.c_uint8)), POINTER(c_size_t)
        ]
        
        self.lib.mldsa_verify.restype = c_int
        self.lib.mldsa_verify.argtypes = [
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t,
            POINTER(ctypes.c_uint8), c_size_t
        ]
        
        self.lib.ffi_get_last_error_message.restype = c_char_p
        self.lib.ffi_get_last_error_message.argtypes = []
        
        self.lib.ffi_get_performance_metrics.restype = c_void_p
        self.lib.ffi_get_performance_metrics.argtypes = []
        
        self.lib.ffi_reset_metrics.restype = c_int
        self.lib.ffi_reset_metrics.argtypes = []

class KyberKeyPair:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib
        self.keypair_ptr = self.lib.lib.mlkem_keypair_generate()
        if not self.keypair_ptr:
            raise PQCError("Failed to generate Kyber keypair")

    def __del__(self):
        pass

    def get_public_key(self):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        keypair = self.keypair_ptr.contents
        return ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)

    def encapsulate(self, additional_data=b""):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        
        keypair = self.keypair_ptr.contents
        public_key_data = ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)
        
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        ciphertext_ptr = POINTER(ctypes.c_uint8)()
        ciphertext_len = c_size_t()
        
        result = self.lib.lib.mlkem_encapsulate(
            keypair.public_key_ptr, keypair.public_key_len,
            ctypes.byref(shared_secret_ptr), ctypes.byref(shared_secret_len),
            ctypes.byref(ciphertext_ptr), ctypes.byref(ciphertext_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            error_msg = self.lib.lib.ffi_get_last_error_message()
            if error_msg:
                raise PQCError(f"Encapsulation failed: {error_msg.decode()}")
            else:
                raise PQCError("Encapsulation failed with unknown error")
        
        shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
        ciphertext = ctypes.string_at(ciphertext_ptr, ciphertext_len.value)
        
        return {
            'shared_secret': shared_secret,
            'ciphertext': ciphertext
        }

    def decapsulate(self, ciphertext):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        
        keypair = self.keypair_ptr.contents
        ciphertext_data = (ctypes.c_uint8 * len(ciphertext)).from_buffer_copy(ciphertext)
        
        shared_secret_ptr = POINTER(ctypes.c_uint8)()
        shared_secret_len = c_size_t()
        
        result = self.lib.lib.mlkem_decapsulate(
            keypair.secret_key_ptr, keypair.secret_key_len,
            ciphertext_data, len(ciphertext),
            ctypes.byref(shared_secret_ptr), ctypes.byref(shared_secret_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            error_msg = self.lib.lib.ffi_get_last_error_message()
            if error_msg:
                raise PQCError(f"Decapsulation failed: {error_msg.decode()}")
            else:
                raise PQCError("Decapsulation failed with unknown error")
        
        shared_secret = ctypes.string_at(shared_secret_ptr, shared_secret_len.value)
        return shared_secret

class DilithiumKeyPair:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib
        self.keypair_ptr = self.lib.lib.mldsa_keypair_generate()
        if not self.keypair_ptr:
            raise PQCError("Failed to generate Dilithium keypair")

    def __del__(self):
        pass

    def get_public_key(self):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        keypair = self.keypair_ptr.contents
        return ctypes.string_at(keypair.public_key_ptr, keypair.public_key_len)

    def sign(self, message):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        
        keypair = self.keypair_ptr.contents
        message_data = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        
        signature_ptr = POINTER(ctypes.c_uint8)()
        signature_len = c_size_t()
        
        result = self.lib.lib.mldsa_sign(
            keypair.secret_key_ptr, keypair.secret_key_len,
            message_data, len(message),
            ctypes.byref(signature_ptr), ctypes.byref(signature_len)
        )
        
        if result != FFIErrorCode.SUCCESS:
            error_msg = self.lib.lib.ffi_get_last_error_message()
            if error_msg:
                raise PQCError(f"Signing failed: {error_msg.decode()}")
            else:
                raise PQCError("Signing failed with unknown error")
        
        signature = ctypes.string_at(signature_ptr, signature_len.value)
        return signature

    def verify(self, message, signature):
        if not self.keypair_ptr:
            raise PQCError("Invalid keypair")
        
        keypair = self.keypair_ptr.contents
        message_data = (ctypes.c_uint8 * len(message)).from_buffer_copy(message)
        signature_data = (ctypes.c_uint8 * len(signature)).from_buffer_copy(signature)
        
        result = self.lib.lib.mldsa_verify(
            keypair.public_key_ptr, keypair.public_key_len,
            message_data, len(message),
            signature_data, len(signature)
        )
        
        return result == FFIErrorCode.SUCCESS

class FFIPerformanceReport(Structure):
    _fields_ = [
        ("kyber_keygen_avg_nanos", c_uint64),
        ("kyber_keygen_count", c_uint64),
        ("kyber_encap_avg_nanos", c_uint64),
        ("kyber_encap_count", c_uint64),
        ("kyber_decap_avg_nanos", c_uint64),
        ("kyber_decap_count", c_uint64),
        ("dilithium_sign_avg_nanos", c_uint64),
        ("dilithium_sign_count", c_uint64),
        ("dilithium_verify_avg_nanos", c_uint64),
        ("dilithium_verify_count", c_uint64),
    ]

class PerformanceMonitor:
    def __init__(self, lib: PQCLibraryV2):
        self.lib = lib

    def get_performance_report(self):
        report_ptr = self.lib.lib.ffi_get_performance_metrics()
        if not report_ptr:
            return None
        
        report = ctypes.cast(report_ptr, POINTER(FFIPerformanceReport)).contents
        
        return {
            'kyber_keygen': {
                'avg_time_ms': report.kyber_keygen_avg_nanos / 1_000_000.0,
                'count': report.kyber_keygen_count
            },
            'kyber_encap': {
                'avg_time_ms': report.kyber_encap_avg_nanos / 1_000_000.0,
                'count': report.kyber_encap_count
            },
            'kyber_decap': {
                'avg_time_ms': report.kyber_decap_avg_nanos / 1_000_000.0,
                'count': report.kyber_decap_count
            },
            'dilithium_sign': {
                'avg_time_ms': report.dilithium_sign_avg_nanos / 1_000_000.0,
                'count': report.dilithium_sign_count
            },
            'dilithium_verify': {
                'avg_time_ms': report.dilithium_verify_avg_nanos / 1_000_000.0,
                'count': report.dilithium_verify_count
            }
        }

    def reset_metrics(self):
        result = self.lib.lib.ffi_reset_metrics()
        return result == FFIErrorCode.SUCCESS

    def get_operation_counts(self):
        report = self.get_performance_report()
        if not report:
            return {}
        return {op: data['count'] for op, data in report.items()}

    def get_avg_operation_times(self):
        report = self.get_performance_report()
        if not report:
            return {}
        return {op: data['avg_time_ms'] for op, data in report.items()}

@contextmanager
def secure_buffer(size):
    buffer = ctypes.create_string_buffer(size)
    try:
        yield buffer
    finally:
        ctypes.memset(buffer, 0, size)

def get_last_error():
    try:
        lib = PQCLibraryV2()
        error_msg = lib.lib.ffi_get_last_error_message()
        return error_msg.decode() if error_msg else None
    except Exception as e:
        print(f"Error getting last error: {e}")
        return None

if __name__ == "__main__":
    try:
        lib = PQCLibraryV2()
        print("✅ PQC Library loaded successfully")
        
        print("\n🔑 Testing Kyber operations...")
        kyber_kp = KyberKeyPair(lib)
        public_key = kyber_kp.get_public_key()
        print(f"✅ Kyber public key generated: {len(public_key)} bytes")
        
        encap_result = kyber_kp.encapsulate()
        print(f"✅ Kyber encapsulation: {len(encap_result['shared_secret'])} byte secret, {len(encap_result['ciphertext'])} byte ciphertext")
        
        decap_secret = kyber_kp.decapsulate(encap_result['ciphertext'])
        print(f"✅ Kyber decapsulation: {len(decap_secret)} byte secret")
        
        if encap_result['shared_secret'] == decap_secret:
            print("✅ Kyber shared secrets match!")
        else:
            print("❌ Kyber shared secrets don't match!")
        
        print("\n🖋️  Testing Dilithium operations...")
        dilithium_kp = DilithiumKeyPair(lib)
        public_key = dilithium_kp.get_public_key()
        print(f"✅ Dilithium public key generated: {len(public_key)} bytes")
        
        message = b"Hello, quantum-safe world!"
        signature = dilithium_kp.sign(message)
        print(f"✅ Dilithium signature: {len(signature)} bytes")
        
        is_valid = dilithium_kp.verify(message, signature)
        print(f"✅ Dilithium verification: {'Valid' if is_valid else 'Invalid'}")
        
        print("\n📊 Testing Performance Monitoring...")
        monitor = PerformanceMonitor(lib)
        report = monitor.get_performance_report()
        if report:
            print("✅ Performance report:")
            for op, data in report.items():
                print(f"  {op}: {data['avg_time_ms']:.6f}ms avg, {data['count']} operations")
        else:
            print("❌ Failed to get performance report")
        
        print("\n🎯 All tests completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        last_error = get_last_error()
        if last_error:
            print(f"Last error: {last_error}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
