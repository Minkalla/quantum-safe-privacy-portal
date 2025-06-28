import time
from pqc_bindings import PQCLibraryV2, KyberKeyPair, DilithiumKeyPair

def test_crypto_operations():
    """Test individual crypto operations to isolate the issue"""
    print("🔍 Testing individual crypto operations...")
    
    try:
        lib = PQCLibraryV2()
        print("✅ Library loaded successfully")
        
        print("\n1. Testing Kyber operations:")
        kp = KyberKeyPair(lib)
        print("✅ Kyber keypair created")
        
        print("Testing encapsulation...")
        ciphertext, shared_secret = kp.encapsulate()
        print(f"✅ Encapsulation successful - shared_secret: {len(shared_secret)} bytes, ciphertext: {len(ciphertext)} bytes")
        
        print("Testing decapsulation...")
        decrypted = kp.decapsulate(ciphertext)
        print(f"✅ Decapsulation successful - decrypted: {len(decrypted)} bytes")
        
        if shared_secret == decrypted:
            print("✅ Shared secrets match!")
        else:
            print("❌ Shared secrets don't match!")
            return False
        
        print("\n2. Testing Dilithium operations:")
        dp = DilithiumKeyPair(lib)
        print("✅ Dilithium keypair created")
        
        message = b"test message for signing"
        print("Testing signing...")
        signature = dp.sign(message)
        print(f"✅ Signing successful - signature: {len(signature)} bytes")
        
        print("Testing verification...")
        valid = dp.verify(message, signature)
        print(f"✅ Verification result: {valid}")
        
        if not valid:
            print("❌ Signature verification failed!")
            return False
        
        print("\n✅ All crypto operations working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_crypto_operations()
    if success:
        print("✅ CRYPTO OPERATIONS TEST PASSED")
    else:
        print("❌ CRYPTO OPERATIONS TEST FAILED")
