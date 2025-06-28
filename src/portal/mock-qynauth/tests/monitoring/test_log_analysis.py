import pytest
import tempfile
import os
import json
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_monitoring_module import LogAnalyzer, ThreatDetector

class TestLogAnalysis:
    
    def test_log_parsing_accuracy(self):
        """Test accurate parsing of various log formats"""
        analyzer = LogAnalyzer()
        
        log_entries = [
            '2025-01-01 12:00:00 INFO [AUTH] User login successful: user=john.doe ip=192.168.1.100',
            '2025-01-01 12:01:00 ERROR [AUTH] Failed login attempt: user=admin ip=192.168.1.200 reason="Invalid password"',
            '2025-01-01 12:02:00 WARN [ACCESS] Privilege escalation attempt: user=guest target_role=admin',
            '{"timestamp": "2025-01-01T12:03:00Z", "level": "ERROR", "module": "CRYPTO", "message": "Key validation failed", "details": {"algorithm": "kyber768"}}'
        ]
        
        parsed_logs = []
        for entry in log_entries:
            parsed = analyzer.parse_log_entry(entry)
            parsed_logs.append(parsed)
        
        assert len(parsed_logs) == 4
        assert parsed_logs[0]['level'] == 'INFO'
        assert parsed_logs[0]['user'] == 'john.doe'
        assert parsed_logs[1]['level'] == 'ERROR'
        assert parsed_logs[1]['ip'] == '192.168.1.200'
        assert parsed_logs[3]['module'] == 'CRYPTO'
    
    def test_threat_pattern_detection(self):
        """Test detection of threat patterns in logs"""
        detector = ThreatDetector()
        threats_detected = []
        
        def threat_handler(threat):
            threats_detected.append(threat)
        
        detector.add_threat_handler(threat_handler)
        
        malicious_logs = [
            "2025-01-01 12:00:00 ERROR [API] Database query failed: SELECT * FROM users WHERE id='1' OR '1'='1'",
            "2025-01-01 12:00:01 ERROR [API] Database query failed: SELECT * FROM users WHERE id=''; DROP TABLE users; --'",
            "2025-01-01 12:00:02 INFO [API] Query executed: SELECT name FROM products WHERE category='electronics'"
        ]
        
        for log_entry in malicious_logs:
            detector.analyze_log_entry(log_entry)
        
        sql_injection_threats = [t for t in threats_detected if t.threat_type == 'SQL_INJECTION']
        assert len(sql_injection_threats) == 2
    
    def test_anomaly_detection_in_logs(self):
        """Test anomaly detection in log patterns"""
        analyzer = LogAnalyzer()
        anomalies = []
        
        def anomaly_handler(anomaly):
            anomalies.append(anomaly)
        
        analyzer.add_anomaly_handler(anomaly_handler)
        
        normal_logs = []
        for hour in range(9, 17):  # 9 AM to 5 PM
            for minute in range(0, 60, 10):
                log_entry = f"2025-01-01 {hour:02d}:{minute:02d}:00 INFO [AUTH] User login: user=employee_{hour}"
                normal_logs.append(log_entry)
                analyzer.process_log_entry(log_entry)
        
        analyzer.train_baseline(normal_logs)
        
        unusual_log = "2025-01-02 03:00:00 INFO [AUTH] User login: user=employee_3"
        analyzer.process_log_entry(unusual_log)
        
        time_anomalies = [a for a in anomalies if a.anomaly_type == 'UNUSUAL_TIME']
        assert len(time_anomalies) > 0
    
    def test_log_correlation_analysis(self):
        """Test correlation analysis across multiple log sources"""
        analyzer = LogAnalyzer()
        correlations = []
        
        def correlation_handler(correlation):
            correlations.append(correlation)
        
        analyzer.add_correlation_handler(correlation_handler)
        
        attack_ip = "192.168.1.100"
        attack_user = "attacker"
        
        for i in range(5):
            log_entry = f"2025-01-01 12:0{i}:00 ERROR [AUTH] Failed login: user={attack_user} ip={attack_ip}"
            analyzer.process_log_entry(log_entry, source='auth_server')
        
        for i in range(3):
            log_entry = f"2025-01-01 12:0{i+2}:00 WARN [FIREWALL] Blocked connection: src_ip={attack_ip} dst_port=22"
            analyzer.process_log_entry(log_entry, source='firewall')
        
        log_entry = f"2025-01-01 12:05:00 ALERT [IDS] Brute force attack detected: src_ip={attack_ip}"
        analyzer.process_log_entry(log_entry, source='ids')
        
        attack_correlations = [c for c in correlations if c.correlation_type == 'COORDINATED_ATTACK']
        assert len(attack_correlations) > 0
        assert attack_ip in attack_correlations[0].involved_ips
    
    def test_log_retention_and_archival(self):
        """Test log retention and archival policies"""
        analyzer = LogAnalyzer()
        
        analyzer.set_retention_policy(days=30)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.log') as temp_log:
            old_date = "2024-11-21"  # 40 days before 2025-01-01
            temp_log.write(f"{old_date} 12:00:00 INFO [TEST] Old log entry\n")
            
            recent_date = "2024-12-22"  # 10 days before 2025-01-01
            temp_log.write(f"{recent_date} 12:00:00 INFO [TEST] Recent log entry\n")
            
            temp_log_path = temp_log.name
        
        try:
            archived_count = analyzer.apply_retention_policy(temp_log_path, current_date="2025-01-01")
            
            assert archived_count > 0
            
            recent_logs = analyzer.get_logs_by_date_range(
                start_date="2024-12-20",
                end_date="2024-12-25"
            )
            assert len(recent_logs) > 0
            
        finally:
            if os.path.exists(temp_log_path):
                os.unlink(temp_log_path)
    
    def test_real_time_log_monitoring(self):
        """Test real-time log monitoring and alerting"""
        analyzer = LogAnalyzer()
        real_time_alerts = []
        
        def real_time_handler(alert):
            real_time_alerts.append(alert)
        
        analyzer.add_real_time_handler(real_time_handler)
        
        analyzer.start_real_time_monitoring()
        
        critical_logs = [
            "2025-01-01 12:00:00 CRITICAL [SECURITY] Root access granted to unauthorized user",
            "2025-01-01 12:00:01 CRITICAL [CRYPTO] Private key compromise detected",
            "2025-01-01 12:00:02 ERROR [NETWORK] Unusual outbound traffic to suspicious IP"
        ]
        
        for log_entry in critical_logs:
            analyzer.process_real_time_log(log_entry)
        
        critical_alerts = [a for a in real_time_alerts if a.severity == 'CRITICAL']
        assert len(critical_alerts) >= 2
        
        analyzer.stop_real_time_monitoring()
