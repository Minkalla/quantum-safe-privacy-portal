#!/usr/bin/env python3
"""
Debug Test - Isolate specific test failures
"""

import os
import sys
import traceback
from pathlib import Path

python_app_path = str(Path(__file__).parent / "src" / "python_app")
sys.path.insert(0, python_app_path)

pqc_bindings_path = str(Path(__file__).parent / "src" / "python_app" / "pqc_bindings")
sys.path.insert(0, pqc_bindings_path)

parent_path = str(Path(__file__).parent)
if parent_path not in sys.path:
    sys.path.insert(0, parent_path)

def test_imports():
    """Test import strategies"""
    print("🔍 Testing import strategies...")
    
    try:
        print("  Trying pqc_bindings.* imports...")
        from pqc_bindings.kyber import KyberKeyPair
        from pqc_bindings.dilithium import DilithiumKeyPair
        from pqc_bindings.legacy import LegacyPQCLibraryV2 as PQCLibraryV2
        print("  ✅ pqc_bindings.* imports successful")
        return KyberKeyPair, DilithiumKeyPair, PQCLibraryV2
    except Exception as e:
        print(f"  ❌ pqc_bindings.* imports failed: {e}")
        traceback.print_exc()
    
    try:
        print("  Trying direct imports...")
        from kyber import KyberKeyPair
        from dilithium import DilithiumKeyPair
        from legacy import LegacyPQCLibraryV2 as PQCLibraryV2
        print("  ✅ Direct imports successful")
        return KyberKeyPair, DilithiumKeyPair, PQCLibraryV2
    except Exception as e:
        print(f"  ❌ Direct imports failed: {e}")
        traceback.print_exc()
    
    try:
        print("  Trying original pqc_bindings imports...")
        from pqc_bindings import PQCLibraryV2, KyberKeyPair, DilithiumKeyPair
        print("  ✅ Original pqc_bindings imports successful")
        return KyberKeyPair, DilithiumKeyPair, PQCLibraryV2
    except Exception as e:
        print(f"  ❌ Original pqc_bindings imports failed: {e}")
        traceback.print_exc()
    
    return None, None, None

def test_basic_operations():
    """Test basic PQC operations"""
    print("\n🔧 Testing basic PQC operations...")
    
    KyberKeyPair, DilithiumKeyPair, PQCLibraryV2 = test_imports()
    
    if not all([KyberKeyPair, DilithiumKeyPair, PQCLibraryV2]):
        print("❌ Cannot proceed - imports failed")
        return False
    
    try:
        print("  Creating PQC library instance...")
        lib = PQCLibraryV2()
        print("  ✅ PQC library instance created")
        
        print("  Creating Kyber keypair...")
        kyber_kp = KyberKeyPair(lib)
        print("  ✅ Kyber keypair instance created")
        
        print("  Generating Kyber keys...")
        kyber_kp.generate_keypair()
        print(f"  ✅ Kyber keys generated - pub: {len(kyber_kp.public_key) if kyber_kp.public_key else 'None'}, priv: {len(kyber_kp.private_key) if kyber_kp.private_key else 'None'}")
        
        print("  Testing Kyber encapsulation...")
        encap_result = kyber_kp.encapsulate()
        print(f"  ✅ Kyber encapsulation successful - type: {type(encap_result)}, keys: {list(encap_result.keys()) if isinstance(encap_result, dict) else 'not dict'}")
        
        if isinstance(encap_result, dict) and 'ciphertext' in encap_result:
            print("  Testing Kyber decapsulation...")
            decap_result = kyber_kp.decapsulate(encap_result['ciphertext'])
            print(f"  ✅ Kyber decapsulation successful - match: {decap_result == encap_result['shared_secret']}")
        
        print("  Creating Dilithium keypair...")
        dilithium_kp = DilithiumKeyPair(lib)
        print("  ✅ Dilithium keypair instance created")
        
        print("  Generating Dilithium keys...")
        dilithium_kp.generate_keypair()
        print(f"  ✅ Dilithium keys generated - pub: {len(dilithium_kp.public_key) if dilithium_kp.public_key else 'None'}, priv: {len(dilithium_kp.private_key) if dilithium_kp.private_key else 'None'}")
        
        print("  Testing Dilithium signing...")
        test_data = b"test_data"
        signature = dilithium_kp.sign(test_data)
        print(f"  ✅ Dilithium signing successful - sig len: {len(signature) if signature else 'None'}")
        
        print("  Testing Dilithium verification...")
        is_valid = dilithium_kp.verify(test_data, signature)
        print(f"  ✅ Dilithium verification successful - valid: {is_valid}")
        
        return True
        
    except Exception as e:
        print(f"❌ Basic operations failed: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Debug Test - Isolating WBS 3.1 Test Failures")
    print("=" * 60)
    
    success = test_basic_operations()
    
    print(f"\n📊 Debug Test Result: {'✅ SUCCESS' if success else '❌ FAILED'}")
    print("=" * 60)
