use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qynauth_pqc::{
    mldsa::{generate_keypair as mldsa_keygen, sign, verify},
    mlkem::{decapsulate, encapsulate, generate_keypair as mlkem_keygen},
};
use secrecy::ExposeSecret;

fn benchmark_mlkem_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("ML-KEM-768");

    group.bench_function("key_generation", |b| {
        b.iter(|| {
            let _keypair = black_box(mlkem_keygen());
        })
    });

    let keypair = mlkem_keygen().unwrap();
    let message = b"benchmark message for encapsulation";

    group.bench_function("encapsulation", |b| {
        b.iter(|| {
            let _result = black_box(encapsulate(&keypair.public_key, message));
        })
    });

    let (ciphertext, _shared_secret) = encapsulate(&keypair.public_key, message).unwrap();

    group.bench_function("decapsulation", |b| {
        b.iter(|| {
            let _result = black_box(decapsulate(
                keypair.private_key.expose_secret(),
                &ciphertext,
            ));
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

    let keypair = mldsa_keygen().unwrap();
    let message = b"benchmark message for digital signature";

    group.bench_function("signing", |b| {
        b.iter(|| {
            let _signature = black_box(sign(keypair.private_key.expose_secret(), message));
        })
    });

    let signature = sign(keypair.private_key.expose_secret(), message).unwrap();

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
            let keypair = black_box(mlkem_keygen().unwrap());
            let message = b"full cycle test message";
            let (ciphertext, _shared_secret) =
                black_box(encapsulate(&keypair.public_key, message).unwrap());
            let _decrypted = black_box(decapsulate(
                keypair.private_key.expose_secret(),
                &ciphertext,
            ));
        })
    });

    group.bench_function("full_mldsa_cycle", |b| {
        b.iter(|| {
            let keypair = black_box(mldsa_keygen().unwrap());
            let message = b"full cycle test message";
            let signature = black_box(sign(keypair.private_key.expose_secret(), message).unwrap());
            let _verified = black_box(verify(&keypair.public_key, message, &signature));
        })
    });

    group.finish();
}

fn benchmark_memory_usage(c: &mut Criterion) {
    let mut group = c.benchmark_group("Memory_Usage");

    group.bench_function("mlkem_memory_footprint", |b| {
        b.iter(|| {
            let keypairs: Vec<_> = (0..100)
                .map(|_| black_box(mlkem_keygen().unwrap()))
                .collect();
            black_box(keypairs);
        })
    });

    group.bench_function("mldsa_memory_footprint", |b| {
        b.iter(|| {
            let keypairs: Vec<_> = (0..100)
                .map(|_| black_box(mldsa_keygen().unwrap()))
                .collect();
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
    benchmark_memory_usage,
    benchmark_throughput_analysis,
    benchmark_key_sizes
);
criterion_main!(benches);

fn benchmark_throughput_analysis(c: &mut Criterion) {
    let mut group = c.benchmark_group("Throughput_Analysis");

    for batch_size in [1, 10, 100, 1000].iter() {
        group.throughput(Throughput::Elements(*batch_size));

        group.bench_with_input(
            BenchmarkId::new("mlkem_batch_keygen", batch_size),
            batch_size,
            |b, &size| {
                b.iter(|| {
                    let keypairs: Vec<_> = (0..size)
                        .map(|_| black_box(mlkem_keygen().unwrap()))
                        .collect();
                    black_box(keypairs);
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("mldsa_batch_keygen", batch_size),
            batch_size,
            |b, &size| {
                b.iter(|| {
                    let keypairs: Vec<_> = (0..size)
                        .map(|_| black_box(mldsa_keygen().unwrap()))
                        .collect();
                    black_box(keypairs);
                })
            },
        );
    }

    group.finish();
}

fn benchmark_key_sizes(c: &mut Criterion) {
    let mut group = c.benchmark_group("Key_Size_Analysis");

    group.bench_function("mlkem_key_sizes", |b| {
        b.iter(|| {
            let keypair = mlkem_keygen().unwrap();
            let pk_size = keypair.public_key.len();
            let sk_size = keypair.private_key.expose_secret().len();
            black_box((pk_size, sk_size));
        })
    });

    group.bench_function("mldsa_key_sizes", |b| {
        b.iter(|| {
            let keypair = mldsa_keygen().unwrap();
            let pk_size = keypair.public_key.len();
            let sk_size = keypair.private_key.expose_secret().len();
            black_box((pk_size, sk_size));
        })
    });

    group.finish();
}
