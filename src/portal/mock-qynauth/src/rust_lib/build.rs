use std::env;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    
    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap();
    let target_feature = env::var("CARGO_CFG_TARGET_FEATURE").unwrap_or_default();
    
    match target_arch.as_str() {
        "x86_64" => {
            if target_feature.contains("avx2") {
                println!("cargo:rustc-cfg=enable_x86_avx2");
                println!("cargo:warning=AVX2 optimizations enabled for x86_64");
            }
        }
        "aarch64" => {
            if target_feature.contains("neon") {
                println!("cargo:rustc-cfg=enable_aarch64_neon");
                println!("cargo:warning=NEON optimizations enabled for aarch64");
            }
        }
        _ => {
            println!("cargo:warning=No hardware acceleration available for {}", target_arch);
        }
    }
    
    println!("cargo:rustc-env=PQC_OPTIMIZATION_LEVEL=3");
    println!("cargo:rustc-env=PQC_TARGET_CPU=native");
    
    if cfg!(feature = "kyber768") {
        println!("cargo:rustc-cfg=pqc_kyber768");
    }
    
    if cfg!(feature = "dilithium3") {
        println!("cargo:rustc-cfg=pqc_dilithium3");
    }
}
