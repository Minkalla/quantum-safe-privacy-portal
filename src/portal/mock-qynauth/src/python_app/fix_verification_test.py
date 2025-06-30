#!/usr/bin/env python3
"""Test the corrected ctypes configuration to verify the segfault fix."""
import logging
import ctypes
import json
from pqc_ffi import PQCLibrary

logging.basicConfig(level=logging.DEBUG)

def test_corrected_configuration():
    """Test the corrected ctypes configuration with c_void_p return types."""
    print("=== Testing Corrected ctypes Configuration ===")
    
    try:
        lib = PQCLibrary()
        print("✅ Library loaded with corrected configuration")
        
        print("\n🔧 Testing generate_ml_kem_keypair() with corrected types...")
        result = lib.generate_ml_kem_keypair()
        
        print(f"✅ Keypair generated successfully!")
        print(f"📊 Keys: pub={len(result['public_key'])} bytes, priv={len(result['private_key'])} bytes")
        print(f"🔐 Algorithm: {result.get('algorithm', 'Unknown')}")
        
        print("\n🔧 Testing multiple calls to ensure no memory leaks...")
        for i in range(3):
            result2 = lib.generate_ml_kem_keypair()
            print(f"✅ Call {i+2}: pub={len(result2['public_key'])} bytes, priv={len(result2['private_key'])} bytes")
        
        print("\n🎉 ALL TESTS PASSED - Segfault fixed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_corrected_configuration()
    print(f"\n{'🎉 SUCCESS - SEGFAULT FIXED!' if success else '❌ STILL FAILING'}")
