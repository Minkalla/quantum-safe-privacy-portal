#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src" / "python_app"))

try:
    from pqc_bindings.utils import (
        secure_buffer, get_last_error, get_kyber_last_error, get_dilithium_last_error,
        kyber_keypair_context, dilithium_keypair_context, safe_bytes_to_ctypes,
        validate_key_sizes
    )
    print("✅ Utility function imports working")
    
    with secure_buffer(32) as buf:
        print(f"✅ Secure buffer context manager working - buffer size: {len(buf)}")
    
    error_msg = get_last_error()
    print(f"✅ get_last_error() working - returned: '{error_msg}'")
    
    kyber_error = get_kyber_last_error()
    print(f"✅ get_kyber_last_error() working - returned: '{kyber_error}'")
    
    dilithium_error = get_dilithium_last_error()
    print(f"✅ get_dilithium_last_error() working - returned: '{dilithium_error}'")
    
    with kyber_keypair_context() as kp:
        print(f"✅ Kyber keypair context manager working - public key len: {len(kp.public_key)}")
    
    with dilithium_keypair_context() as dp:
        print(f"✅ Dilithium keypair context manager working - public key len: {len(dp.public_key)}")
    
    test_data = b"Hello, World!"
    ctypes_array = safe_bytes_to_ctypes(test_data)
    print(f"✅ safe_bytes_to_ctypes working - converted {len(test_data)} bytes")
    
    validation = validate_key_sizes()
    print(f"✅ validate_key_sizes working - result: {validation}")
    
    print("🎯 All utility functions working!")
    
except Exception as e:
    print(f"❌ Utility function issue: {e}")
    import traceback
    traceback.print_exc()
