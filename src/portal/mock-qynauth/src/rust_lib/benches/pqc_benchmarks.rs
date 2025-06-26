use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use qynauth_pqc::{
    mlkem::{generate_keypair as mlkem_keygen, encapsulate, decapsulate},
    mldsa::{generate_keypair as mldsa_keygen, sign, verify},
};

fn benchmark_mlkem_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("ML-KEM-768");
    
    group.bench_function("key_generation", |b| {
        b.iter(|| {
            let _keypair = black_box(mlkem_keygen());
        })
    });

    let keypair = mlkem_keygen();
    let message = b"benchmark message for encapsulation";
    
    group.bench_function("encapsulation", |b| {
        b.iter(|| {
            let _result = black_box(encapsulate(&keypair.public_key, message));
        })
    });

    let (ciphertext, shared_secret) = encapsulate(&keypair.public_key, message);
    
    group.bench_function("decapsulation", |b| {
        b.iter(|| {
            let _result = black_box(decapsulate(&keypair.private_key, &ciphertext));
        })
    });

    group.finish();
}

fn benchmark_mldsa_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("ML-DSA-65");
    
    group.bench_function("key_generation", |b| {
        b.iter(|| {
            let _keypair = black_box(mldsa_keygen());
        })
    });

    let keypair = mldsa_keygen();
    let message = b"benchmark message for digital signature";
    
    group.bench_function("signing", |b| {
        b.iter(|| {
            let _signature = black_box(sign(&keypair.private_key, message));
        })
    });

    let signature = sign(&keypair.private_key, message);
    
    group.bench_function("verification", |b| {
        b.iter(|| {
            let _result = black_box(verify(&keypair.public_key, message, &signature));
        })
    });

    group.finish();
}

fn benchmark_combined_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("Combined_Operations");
    
    group.bench_function("full_mlkem_cycle", |b| {
        b.iter(|| {
            let keypair = black_box(mlkem_keygen());
            let message = b"full cycle test message";
            let (ciphertext, _shared_secret) = black_box(encapsulate(&keypair.public_key, message));
            let _decrypted = black_box(decapsulate(&keypair.private_key, &ciphertext));
        })
    });

    group.bench_function("full_mldsa_cycle", |b| {
        b.iter(|| {
            let keypair = black_box(mldsa_keygen());
            let message = b"full cycle test message";
            let signature = black_box(sign(&keypair.private_key, message));
            let _verified = black_box(verify(&keypair.public_key, message, &signature));
        })
    });

    group.finish();
}

fn benchmark_memory_usage(c: &mut Criterion) {
    let mut group = c.benchmark_group("Memory_Usage");
    
    group.bench_function("mlkem_memory_footprint", |b| {
        b.iter(|| {
            let keypairs: Vec<_> = (0..100).map(|_| black_box(mlkem_keygen())).collect();
            black_box(keypairs);
        })
    });

    group.bench_function("mldsa_memory_footprint", |b| {
        b.iter(|| {
            let keypairs: Vec<_> = (0..100).map(|_| black_box(mldsa_keygen())).collect();
            black_box(keypairs);
        })
    });

    group.finish();
}

criterion_group!(
    benches,
    benchmark_mlkem_operations,
    benchmark_mldsa_operations,
    benchmark_combined_operations,
    benchmark_memory_usage
);
criterion_main!(benches);
