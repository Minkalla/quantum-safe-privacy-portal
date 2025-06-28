#!/usr/bin/env python3
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "src" / "python_app"))

try:
    from pqc_bindings import KyberKeyPair, DilithiumKeyPair
    print("✅ FFI imports working")
    
    kp = KyberKeyPair()
    print("✅ Kyber keypair generation working")
    print(f"Public key length: {len(kp.public_key)} bytes")
    
    shared_secret, ciphertext = kp.encapsulate()
    print("✅ Kyber encapsulation working")
    print(f"Shared secret length: {len(shared_secret)} bytes")
    print(f"Ciphertext length: {len(ciphertext)} bytes")
    
    recovered_secret = kp.decapsulate(ciphertext)
    print("✅ Kyber decapsulation working")
    print(f"Secrets match: {shared_secret == recovered_secret}")
    
    print("🎯 FFI working!")
    
except Exception as e:
    print(f"❌ FFI issue: {e}")
    import traceback
    traceback.print_exc()
