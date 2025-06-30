#!/usr/bin/env python3
"""Test different ctypes function signatures for free_string to find the correct one."""
import logging
import ctypes
import json
from pqc_ffi import PQCLibrary

logging.basicConfig(level=logging.DEBUG)

def test_function_signatures():
    """Test different ctypes signatures for free_string to find the compatible one."""
    print("=== Testing Different Function Signatures ===")
    
    try:
        lib = PQCLibrary()
        print("✅ Library loaded successfully")
        
        print("\n🧪 Test 1: c_char_p signature (current)")
        try:
            lib.lib.free_string.argtypes = [ctypes.c_char_p]
            lib.lib.free_string.restype = None
            
            raw_ptr = lib.lib.pqc_ml_kem_768_keygen()
            print(f"📍 Got pointer: {raw_ptr}")
            
            raw_bytes = ctypes.cast(raw_ptr, ctypes.c_char_p).value
            json_str = raw_bytes.decode('utf-8')
            result = json.loads(json_str)
            print(f"✅ JSON parsed: pub={len(result['public_key'])} bytes")
            
            lib.lib.free_string(raw_ptr)
            print("✅ c_char_p signature worked!")
            return True
        except Exception as e:
            print(f"❌ c_char_p signature failed: {e}")
        
        print("\n🧪 Test 2: c_void_p signature")
        try:
            lib.lib.free_string.argtypes = [ctypes.c_void_p]
            lib.lib.free_string.restype = None
            
            raw_ptr = lib.lib.pqc_ml_kem_768_keygen()
            print(f"📍 Got pointer: {raw_ptr}")
            
            raw_bytes = ctypes.cast(raw_ptr, ctypes.c_char_p).value
            json_str = raw_bytes.decode('utf-8')
            result = json.loads(json_str)
            print(f"✅ JSON parsed: pub={len(result['public_key'])} bytes")
            
            lib.lib.free_string(ctypes.cast(raw_ptr, ctypes.c_void_p))
            print("✅ c_void_p signature worked!")
            return True
        except Exception as e:
            print(f"❌ c_void_p signature failed: {e}")
        
        print("\n🧪 Test 3: POINTER(c_char) signature")
        try:
            lib.lib.free_string.argtypes = [ctypes.POINTER(ctypes.c_char)]
            lib.lib.free_string.restype = None
            
            raw_ptr = lib.lib.pqc_ml_kem_768_keygen()
            print(f"📍 Got pointer: {raw_ptr}")
            
            raw_bytes = ctypes.cast(raw_ptr, ctypes.c_char_p).value
            json_str = raw_bytes.decode('utf-8')
            result = json.loads(json_str)
            print(f"✅ JSON parsed: pub={len(result['public_key'])} bytes")
            
            lib.lib.free_string(ctypes.cast(raw_ptr, ctypes.POINTER(ctypes.c_char)))
            print("✅ POINTER(c_char) signature worked!")
            return True
        except Exception as e:
            print(f"❌ POINTER(c_char) signature failed: {e}")
        
        print("\n🧪 Test 4: No explicit signature (auto-detect)")
        try:
            if hasattr(lib.lib.free_string, 'argtypes'):
                delattr(lib.lib.free_string, 'argtypes')
            if hasattr(lib.lib.free_string, 'restype'):
                delattr(lib.lib.free_string, 'restype')
            
            raw_ptr = lib.lib.pqc_ml_kem_768_keygen()
            print(f"📍 Got pointer: {raw_ptr}")
            
            raw_bytes = ctypes.cast(raw_ptr, ctypes.c_char_p).value
            json_str = raw_bytes.decode('utf-8')
            result = json.loads(json_str)
            print(f"✅ JSON parsed: pub={len(result['public_key'])} bytes")
            
            lib.lib.free_string(raw_ptr)
            print("✅ Auto-detect signature worked!")
            return True
        except Exception as e:
            print(f"❌ Auto-detect signature failed: {e}")
        
        return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_function_signatures()
    print(f"\n{'✅ FOUND WORKING SIGNATURE' if success else '❌ ALL SIGNATURES FAILED'}")
