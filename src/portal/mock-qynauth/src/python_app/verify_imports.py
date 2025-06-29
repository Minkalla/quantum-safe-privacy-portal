#!/usr/bin/env python3
"""
Import Verification Script for WBS 3.1.7

This script verifies that all import updates are working correctly
after restructuring the pqc_bindings package.
"""

def test_backward_compatibility_imports():
    """Test that backward compatibility imports still work."""
    try:
        from pqc_bindings import PQCLibraryV2, KyberKeyPair, DilithiumKeyPair, PerformanceMonitor
        print('✅ Backward compatibility imports working')
        return True
    except ImportError as e:
        print(f'❌ Backward compatibility import error: {e}')
        return False

def test_new_modular_imports():
    """Test that new modular imports work."""
    try:
        from pqc_bindings.kyber import KyberKeyPair as NewKyber
        from pqc_bindings.dilithium import DilithiumKeyPair as NewDilithium
        from pqc_bindings.legacy import LegacyPQCLibraryV2
        from pqc_bindings.performance import PerformanceMonitor as NewPerformanceMonitor
        from pqc_bindings.exceptions import PQCError, KyberError, DilithiumError
        print('✅ New modular imports working')
        return True
    except ImportError as e:
        print(f'❌ New modular import error: {e}')
        return False

def test_specific_file_imports():
    """Test imports from specific updated files."""
    test_results = []
    
    try:
        from pqc_bindings.legacy import LegacyPQCLibraryV2 as PQCLibraryV2
        from pqc_bindings.performance import PerformanceMonitor
        print('✅ ffi_performance_monitor.py style imports working')
        test_results.append(True)
    except ImportError as e:
        print(f'❌ ffi_performance_monitor.py style import error: {e}')
        test_results.append(False)
    
    try:
        from pqc_bindings.kyber import KyberKeyPair
        from pqc_bindings.dilithium import DilithiumKeyPair
        from pqc_bindings.performance import PerformanceMonitor
        from pqc_bindings.exceptions import PQCError, KyberError, DilithiumError
        from pqc_bindings.legacy import LegacyPQCLibraryV2 as PQCLibraryV2
        print('✅ pqc_auth.py style imports working')
        test_results.append(True)
    except ImportError as e:
        print(f'❌ pqc_auth.py style import error: {e}')
        test_results.append(False)
    
    return all(test_results)

def main():
    """Run all import verification tests."""
    print("🔍 Verifying WBS 3.1.7 Import Updates...")
    print("=" * 50)
    
    tests = [
        test_backward_compatibility_imports,
        test_new_modular_imports,
        test_specific_file_imports
    ]
    
    results = []
    for test in tests:
        results.append(test())
        print()
    
    if all(results):
        print("🎉 All import updates successful - WBS 3.1.7 complete!")
        print("✅ Enhanced pqc_bindings package structure is working correctly")
        print("✅ Backward compatibility maintained")
        print("✅ All updated files can import successfully")
        return True
    else:
        print("❌ Some import tests failed - WBS 3.1.7 needs attention")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
