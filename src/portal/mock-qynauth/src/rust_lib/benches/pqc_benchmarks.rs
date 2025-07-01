use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};
use qynauth_pqc::{
    mldsa::{generate_keypair as mldsa_keygen, sign, verify},
    mlkem::{decapsulate, encapsulate, generate_keypair as mlkem_keygen},
};
use secrecy::ExposeSecret;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::time::{Duration, Instant};

fn benchmark_mlkem_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("ML-KEM-768");
    group.sample_size(1000);

    let mut baseline_measurements = Vec::new();

    group.bench_function("key_generation", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _keypair = black_box(mlkem_keygen());
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mlkem_keygen".to_string(), duration));
            }
            start.elapsed()
        })
    });

    let keypair = mlkem_keygen().unwrap();
    let message = b"benchmark message for encapsulation";

    group.bench_function("encapsulation", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _result = black_box(encapsulate(&keypair.public_key, message));
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mlkem_encap".to_string(), duration));
            }
            start.elapsed()
        })
    });

    let (ciphertext, _shared_secret) = encapsulate(&keypair.public_key, message).unwrap();

    group.bench_function("decapsulation", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _result = black_box(decapsulate(
                    keypair.private_key.expose_secret(),
                    &ciphertext,
                ));
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mlkem_decap".to_string(), duration));
            }
            start.elapsed()
        })
    });

    save_baseline_measurements(&baseline_measurements, "mlkem");

    group.finish();
}

fn benchmark_mldsa_operations(c: &mut Criterion) {
    let mut group = c.benchmark_group("ML-DSA-65");
    group.sample_size(1000);

    let mut baseline_measurements = Vec::new();

    group.bench_function("key_generation", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _keypair = black_box(mldsa_keygen());
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mldsa_keygen".to_string(), duration));
            }
            start.elapsed()
        })
    });

    let keypair = mldsa_keygen().unwrap();
    let message = b"benchmark message for digital signature";

    group.bench_function("signing", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _signature = black_box(sign(keypair.private_key.expose_secret(), message));
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mldsa_sign".to_string(), duration));
            }
            start.elapsed()
        })
    });

    let signature = sign(keypair.private_key.expose_secret(), message).unwrap();

    group.bench_function("verification", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let operation_start = Instant::now();
                let _result = black_box(verify(&keypair.public_key, message, &signature));
                let duration = operation_start.elapsed();
                baseline_measurements.push(("mldsa_verify".to_string(), duration));
            }
            start.elapsed()
        })
    });

    save_baseline_measurements(&baseline_measurements, "mldsa");

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
    benchmark_memory_usage,
    benchmark_throughput_analysis,
    benchmark_key_sizes,
    benchmark_comprehensive_baselines
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
                    let keypairs: Vec<_> = (0..size).map(|_| black_box(mlkem_keygen())).collect();
                    black_box(keypairs);
                })
            },
        );

        group.bench_with_input(
            BenchmarkId::new("mldsa_batch_keygen", batch_size),
            batch_size,
            |b, &size| {
                b.iter(|| {
                    let keypairs: Vec<_> = (0..size).map(|_| black_box(mldsa_keygen())).collect();
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

fn save_baseline_measurements(measurements: &[(String, Duration)], algorithm: &str) {
    let report_path = format!(
        "/tmp/pqc_performance/baselines/{}_baseline_measurements.txt",
        algorithm
    );

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&report_path)
    {
        writeln!(
            file,
            "\n=== {} Performance Baseline Measurements ===",
            algorithm.to_uppercase()
        )
        .ok();
        writeln!(
            file,
            "Generated: {}",
            chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
        )
        .ok();
        writeln!(file, "WBS 2.5.1: Comprehensive Performance Baselines\n").ok();

        let mut grouped: HashMap<String, Vec<Duration>> = HashMap::new();
        for (operation, duration) in measurements {
            grouped
                .entry(operation.clone())
                .or_insert_with(Vec::new)
                .push(*duration);
        }

        for (operation, durations) in grouped {
            if !durations.is_empty() {
                let mut sorted_durations = durations.clone();
                sorted_durations.sort();

                let mean = Duration::from_nanos(
                    sorted_durations.iter().map(|d| d.as_nanos()).sum::<u128>() as u64
                        / sorted_durations.len() as u64,
                );

                let median_idx = sorted_durations.len() / 2;
                let median = sorted_durations[median_idx];

                let p95_idx = (sorted_durations.len() as f64 * 0.95) as usize;
                let p95 = sorted_durations[p95_idx.min(sorted_durations.len() - 1)];

                let p99_idx = (sorted_durations.len() as f64 * 0.99) as usize;
                let p99 = sorted_durations[p99_idx.min(sorted_durations.len() - 1)];

                writeln!(file, "Operation: {}", operation).ok();
                writeln!(file, "  Sample Count: {}", sorted_durations.len()).ok();
                writeln!(file, "  Mean Duration: {:?}", mean).ok();
                writeln!(file, "  Median Duration: {:?}", median).ok();
                writeln!(file, "  95th Percentile: {:?}", p95).ok();
                writeln!(file, "  99th Percentile: {:?}", p99).ok();
                writeln!(file, "  Min Duration: {:?}", sorted_durations[0]).ok();
                writeln!(
                    file,
                    "  Max Duration: {:?}",
                    sorted_durations[sorted_durations.len() - 1]
                )
                .ok();
                writeln!(file, "").ok();
            }
        }
    }
}

fn benchmark_comprehensive_baselines(c: &mut Criterion) {
    let mut group = c.benchmark_group("Comprehensive_Baselines");
    group.measurement_time(Duration::from_secs(15));
    group.sample_size(2000);

    let mut all_measurements = Vec::new();

    group.bench_function("mlkem_full_cycle_baseline", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            for _ in 0..iters {
                let keygen_start = Instant::now();
                let keypair = mlkem_keygen().unwrap();
                let keygen_duration = keygen_start.elapsed();
                all_measurements.push(("mlkem_keygen_baseline".to_string(), keygen_duration));

                let message = b"comprehensive baseline test message";
                let encap_start = Instant::now();
                let (ciphertext, _shared_secret) =
                    encapsulate(&keypair.public_key, message).unwrap();
                let encap_duration = encap_start.elapsed();
                all_measurements.push(("mlkem_encap_baseline".to_string(), encap_duration));

                let decap_start = Instant::now();
                let _decrypted = decapsulate(keypair.private_key.expose_secret(), &ciphertext);
                let decap_duration = decap_start.elapsed();
                all_measurements.push(("mlkem_decap_baseline".to_string(), decap_duration));

                black_box((keypair, ciphertext, _shared_secret, _decrypted));
            }
            start.elapsed()
        })
    });

    group.bench_function("mldsa_full_cycle_baseline", |b| {
        b.iter_custom(|iters| {
            let start = Instant::now();
            let message = b"comprehensive baseline test message";
            for _ in 0..iters {
                let keygen_start = Instant::now();
                let keypair = mldsa_keygen().unwrap();
                let keygen_duration = keygen_start.elapsed();
                all_measurements.push(("mldsa_keygen_baseline".to_string(), keygen_duration));

                let sign_start = Instant::now();
                let signature = sign(keypair.private_key.expose_secret(), message).unwrap();
                let sign_duration = sign_start.elapsed();
                all_measurements.push(("mldsa_sign_baseline".to_string(), sign_duration));

                let verify_start = Instant::now();
                let _valid = verify(&keypair.public_key, message, &signature);
                let verify_duration = verify_start.elapsed();
                all_measurements.push(("mldsa_verify_baseline".to_string(), verify_duration));

                black_box((keypair, signature, _valid));
            }
            start.elapsed()
        })
    });

    save_baseline_measurements(&all_measurements, "comprehensive");
    group.finish();
}
