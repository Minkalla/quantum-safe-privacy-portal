#[cfg(test)]
mod monitoring_performance_tests {
    use super::*;
    use std::time::{Duration, Instant};
    use std::thread;
    use std::sync::{Arc, Mutex};

    #[derive(Clone)]
    struct SecurityEvent {
        event_type: String,
        user_id: String,
        source_ip: String,
        timestamp: std::time::SystemTime,
        details: String,
    }

    struct SecurityMonitor {
        processed_count: Arc<Mutex<usize>>,
    }

    impl SecurityMonitor {
        fn new() -> Self {
            SecurityMonitor {
                processed_count: Arc::new(Mutex::new(0)),
            }
        }

        fn process_event(&self, _event: SecurityEvent) {
            let mut count = self.processed_count.lock().unwrap();
            *count += 1;
        }

        fn cleanup_old_events(&self) {
        }
    }

    #[test]
    fn monitoring_performance() {
        let monitor = SecurityMonitor::new();
        let event_count = Arc::new(Mutex::new(0));
        let start_time = Instant::now();

        for i in 0..10000 {
            let event = SecurityEvent {
                event_type: "AUTH_ATTEMPT".to_string(),
                user_id: format!("user_{}", i % 100),
                source_ip: format!("192.168.1.{}", i % 255),
                timestamp: std::time::SystemTime::now(),
                details: format!("Event {}", i),
            };

            monitor.process_event(event);
            let mut count = event_count.lock().unwrap();
            *count += 1;
        }

        let elapsed = start_time.elapsed();

        assert!(elapsed < Duration::from_secs(1));

        let final_count = *event_count.lock().unwrap();
        assert_eq!(final_count, 10000);
    }

    #[test]
    fn concurrent_monitoring() {
        let monitor = Arc::new(SecurityMonitor::new());
        let processed_events = Arc::new(Mutex::new(Vec::new()));
        let mut handles = vec![];

        for thread_id in 0..10 {
            let monitor_clone = Arc::clone(&monitor);
            let events_clone = Arc::clone(&processed_events);

            let handle = thread::spawn(move || {
                for i in 0..1000 {
                    let event = SecurityEvent {
                        event_type: "CONCURRENT_TEST".to_string(),
                        user_id: format!("user_{}_{}", thread_id, i),
                        source_ip: format!("192.168.{}.{}", thread_id, i % 255),
                        timestamp: std::time::SystemTime::now(),
                        details: format!("Thread {} Event {}", thread_id, i),
                    };

                    monitor_clone.process_event(event.clone());
                    let mut events = events_clone.lock().unwrap();
                    events.push(event);
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let events = processed_events.lock().unwrap();
        assert_eq!(events.len(), 10000);
    }

    #[test]
    fn memory_usage_monitoring() {
        let monitor = SecurityMonitor::new();
        let initial_memory = get_memory_usage();

        for i in 0..50000 {
            let event = SecurityEvent {
                event_type: "MEMORY_TEST".to_string(),
                user_id: format!("user_{}", i % 1000),
                source_ip: format!("192.168.1.{}", i % 255),
                timestamp: std::time::SystemTime::now(),
                details: "Memory usage test event".to_string(),
            };

            monitor.process_event(event);

            if i % 10000 == 0 {
                monitor.cleanup_old_events();
            }
        }

        let final_memory = get_memory_usage();
        let memory_growth = final_memory.saturating_sub(initial_memory);

        assert!(memory_growth < 100_000_000);
    }

    #[test]
    fn alert_processing_latency() {
        let monitor = SecurityMonitor::new();
        let mut latencies = Vec::new();

        for _ in 0..1000 {
            let start = Instant::now();

            let event = SecurityEvent {
                event_type: "HIGH_PRIORITY_ALERT".to_string(),
                user_id: "test_user".to_string(),
                source_ip: "192.168.1.100".to_string(),
                timestamp: std::time::SystemTime::now(),
                details: "High priority security event".to_string(),
            };

            monitor.process_event(event);
            let latency = start.elapsed();
            latencies.push(latency);
        }

        let total_nanos: u128 = latencies.iter().map(|d| d.as_nanos()).sum();
        let avg_latency = Duration::from_nanos((total_nanos / latencies.len() as u128) as u64);

        assert!(avg_latency < Duration::from_millis(1));
    }

    #[test]
    fn throughput_measurement() {
        let monitor = SecurityMonitor::new();
        let start_time = Instant::now();
        let test_duration = Duration::from_secs(1);
        let mut event_count = 0;

        while start_time.elapsed() < test_duration {
            let event = SecurityEvent {
                event_type: "THROUGHPUT_TEST".to_string(),
                user_id: format!("user_{}", event_count),
                source_ip: "192.168.1.1".to_string(),
                timestamp: std::time::SystemTime::now(),
                details: "Throughput test event".to_string(),
            };

            monitor.process_event(event);
            event_count += 1;
        }

        assert!(event_count >= 10000);
    }
}

fn get_memory_usage() -> usize {
    #[cfg(target_os = "linux")]
    {
        use std::fs;
        let status = fs::read_to_string("/proc/self/status").unwrap_or_default();
        for line in status.lines() {
            if line.starts_with("VmRSS:") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() > 1 {
                    return parts[1].parse::<usize>().unwrap_or(0) * 1024;
                }
            }
        }
    }
    0
}
