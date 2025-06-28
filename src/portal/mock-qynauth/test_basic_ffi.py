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
    print(f"Kyber public key length: {len(kp.public_key)} bytes")
    
    shared_secret, ciphertext = kp.encapsulate()
    print("✅ Kyber encapsulation working")
    print(f"Shared secret length: {len(shared_secret)} bytes")
    print(f"Ciphertext length: {len(ciphertext)} bytes")
    
    recovered_secret = kp.decapsulate(ciphertext)
    print("✅ Kyber decapsulation working")
    print(f"Secrets match: {shared_secret == recovered_secret}")
    
    dp = DilithiumKeyPair()
    print("✅ Dilithium keypair generation working")
    print(f"Dilithium public key length: {len(dp.public_key)} bytes")
    
    message = b"Hello, Quantum-Safe World!"
    signature = dp.sign(message)
    print("✅ Dilithium signing working")
    print(f"Signature length: {len(signature)} bytes")
    
    is_valid = dp.verify(message, signature)
    print("✅ Dilithium verification working")
    print(f"Signature valid: {is_valid}")
    
    invalid_signature = dp.verify(b"Different message", signature)
    print(f"Invalid signature correctly rejected: {not invalid_signature}")
    
    print("🎯 Complete FFI working!")
    
except Exception as e:
    print(f"❌ FFI issue: {e}")
    import traceback
    traceback.print_exc()
