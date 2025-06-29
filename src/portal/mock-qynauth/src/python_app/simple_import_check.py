#!/usr/bin/env python3
"""
Simple Import Check for WBS 3.1.7

This script verifies that import statements have been updated correctly
without trying to actually import the modules (which may have dependency issues).
"""

import os
import re

def check_file_imports(file_path, expected_patterns, description):
    """Check if a file contains expected import patterns."""
    if not os.path.exists(file_path):
        print(f"❌ {description}: File not found - {file_path}")
        return False
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        found_patterns = []
        missing_patterns = []
        
        for pattern in expected_patterns:
            if pattern in content:
                found_patterns.append(pattern)
            else:
                missing_patterns.append(pattern)
        
        if missing_patterns:
            print(f"❌ {description}: Missing imports - {missing_patterns}")
            return False
        else:
            print(f"✅ {description}: All expected imports found")
            return True
            
    except Exception as e:
        print(f"❌ {description}: Error reading file - {e}")
        return False

def check_old_imports_removed():
    """Check that old import patterns have been removed."""
    files_to_check = [
        'ffi_performance_monitor.py',
        'test_wbs_2_3_6_local.py', 
        'test_crypto_debug.py',
        'tests/test_pqc_ffi_v2.py'
    ]
    
    old_patterns = [
        'from pqc_bindings import PQCLibraryV2',
        'from pqc_bindings import KyberKeyPair',
        'from pqc_bindings import DilithiumKeyPair',
        'from pqc_bindings import PerformanceMonitor'
    ]
    
    all_clean = True
    
    for file_path in files_to_check:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                content = f.read()
            
            found_old_imports = []
            for pattern in old_patterns:
                if pattern in content:
                    found_old_imports.append(pattern)
            
            if found_old_imports:
                print(f"❌ {file_path}: Still has old imports - {found_old_imports}")
                all_clean = False
            else:
                print(f"✅ {file_path}: No old imports found")
        else:
            print(f"⚠️  {file_path}: File not found")
    
    return all_clean

def main():
    """Run import verification checks."""
    print("🔍 Simple Import Check for WBS 3.1.7")
    print("=" * 50)
    
    checks = [
        (
            'ffi_performance_monitor.py',
            [
                'from pqc_bindings.legacy import LegacyPQCLibraryV2',
                'from pqc_bindings.performance import PerformanceMonitor'
            ],
            'FFI Performance Monitor'
        ),
        (
            'test_wbs_2_3_6_local.py',
            [
                'from pqc_bindings.legacy import LegacyPQCLibraryV2',
                'from pqc_bindings.kyber import KyberKeyPair',
                'from pqc_bindings.dilithium import DilithiumKeyPair'
            ],
            'WBS 2.3.6 Local Test'
        ),
        (
            'test_crypto_debug.py',
            [
                'from pqc_bindings.legacy import LegacyPQCLibraryV2',
                'from pqc_bindings.kyber import KyberKeyPair',
                'from pqc_bindings.dilithium import DilithiumKeyPair'
            ],
            'Crypto Debug Test'
        ),
        (
            'tests/test_pqc_ffi_v2.py',
            [
                'from pqc_bindings.legacy import LegacyPQCLibraryV2',
                'from pqc_bindings.kyber import KyberKeyPair',
                'from pqc_bindings.dilithium import DilithiumKeyPair'
            ],
            'PQC FFI V2 Test'
        )
    ]
    
    results = []
    
    for file_path, expected_patterns, description in checks:
        result = check_file_imports(file_path, expected_patterns, description)
        results.append(result)
    
    print("\n📋 Checking for old import patterns...")
    old_imports_clean = check_old_imports_removed()
    results.append(old_imports_clean)
    
    print("\n📋 Checking package structure...")
    package_files = [
        'pqc_bindings/__init__.py',
        'pqc_bindings/kyber.py',
        'pqc_bindings/dilithium.py',
        'pqc_bindings/legacy.py',
        'pqc_bindings/exceptions.py',
        'pqc_bindings/performance.py',
        'pqc_bindings/utils.py'
    ]
    
    package_complete = True
    for file_path in package_files:
        if os.path.exists(file_path):
            print(f"✅ Package file exists: {file_path}")
        else:
            print(f"❌ Package file missing: {file_path}")
            package_complete = False
    
    results.append(package_complete)
    
    print("\n" + "=" * 50)
    if all(results):
        print("🎉 WBS 3.1.7 Import Updates Complete!")
        print("✅ All files have been updated with new import structure")
        print("✅ Old import patterns have been removed")
        print("✅ Enhanced package structure is in place")
        return True
    else:
        print("❌ WBS 3.1.7 Import Updates Need Attention")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
