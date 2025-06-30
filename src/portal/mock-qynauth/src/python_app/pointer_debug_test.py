#!/usr/bin/env python3
"""Advanced pointer debugging to isolate the exact cause of 'invalid pointer' error."""
import logging
import ctypes
import json
from pqc_ffi import PQCLibrary

logging.basicConfig(level=logging.DEBUG)

def test_pointer_lifecycle():
    """Test the complete pointer lifecycle with detailed logging."""
    print("=== Advanced Pointer Lifecycle Debug ===")
    
    try:
        lib = PQCLibrary()
        print("✅ Library loaded successfully")
        
        print("\n🔧 Step 1: Call pqc_ml_kem_768_keygen and capture raw pointer...")
        raw_ptr = lib.lib.pqc_ml_kem_768_keygen()
        print(f"📍 Raw pointer: {raw_ptr}")
        print(f"📍 Raw pointer type: {type(raw_ptr)}")
        print(f"📍 Raw pointer repr: {repr(raw_ptr)}")
        
        if not raw_ptr:
            print("❌ Null pointer returned")
            return False
        
        print("\n🔧 Step 2: Cast to c_char_p and extract value...")
        c_char_ptr = ctypes.cast(raw_ptr, ctypes.c_char_p)
        print(f"📍 c_char_p: {c_char_ptr}")
        print(f"📍 c_char_p type: {type(c_char_ptr)}")
        
        raw_bytes = c_char_ptr.value
        print(f"📍 Raw bytes length: {len(raw_bytes) if raw_bytes else 'None'}")
        
        if raw_bytes is None:
            print("❌ Null bytes from pointer")
            return False
        
        print("\n🔧 Step 3: Decode and parse JSON...")
        json_str = raw_bytes.decode('utf-8')
        result = json.loads(json_str)
        print(f"✅ JSON parsed successfully")
        print(f"📊 Keys: pub={len(result['public_key'])} bytes, priv={len(result['private_key'])} bytes")
        
        print("\n🔧 Step 4: Test different free_string approaches...")
        
        print("4a. Testing with original raw_ptr...")
        try:
            print(f"📍 About to free raw_ptr: {raw_ptr}")
            lib.lib.free_string(raw_ptr)
            print("✅ Successfully freed with raw_ptr")
            return True
        except Exception as e:
            print(f"❌ Failed to free with raw_ptr: {e}")
        
        print("4b. Testing with c_char_p...")
        try:
            raw_ptr2 = lib.lib.pqc_ml_kem_768_keygen()
            c_char_ptr2 = ctypes.cast(raw_ptr2, ctypes.c_char_p)
            print(f"📍 About to free c_char_ptr2: {c_char_ptr2}")
            lib.lib.free_string(c_char_ptr2)
            print("✅ Successfully freed with c_char_p")
            return True
        except Exception as e:
            print(f"❌ Failed to free with c_char_p: {e}")
        
        print("4c. Testing with void pointer...")
        try:
            raw_ptr3 = lib.lib.pqc_ml_kem_768_keygen()
            void_ptr = ctypes.cast(raw_ptr3, ctypes.c_void_p)
            print(f"📍 About to free void_ptr: {void_ptr}")
            lib.lib.free_string(void_ptr)
            print("✅ Successfully freed with c_void_p")
            return True
        except Exception as e:
            print(f"❌ Failed to free with c_void_p: {e}")
        
        return False
        
    except Exception as e:
        print(f"❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_pointer_lifecycle()
    print(f"\n{'✅ SUCCESS' if success else '❌ ALL APPROACHES FAILED'}")
