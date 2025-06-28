import pytest
import threading
import time
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_monitoring_module import SecurityMonitor, SecurityEvent

class TestSecurityEventDetection:
    
    def test_authentication_failure_detection(self):
        """Test detection of authentication failures"""
        monitor = SecurityMonitor()
        events_detected = []
        
        def event_handler(event):
            events_detected.append(event)
        
        monitor.add_event_handler('AUTH_FAILURE', event_handler)
        
        for i in range(5):
            monitor.log_auth_failure(f"user_{i}", "192.168.1.100", "Invalid password")
            time.sleep(0.1)  # Allow processing
        
        assert len(events_detected) == 5
        for event in events_detected:
            assert event.event_type == 'AUTH_FAILURE'
            assert event.source_ip == "192.168.1.100"
    
    def test_brute_force_attack_detection(self):
        """Test detection of brute force attacks"""
        monitor = SecurityMonitor()
        alerts_triggered = []
        
        def alert_handler(alert):
            alerts_triggered.append(alert)
        
        monitor.add_alert_handler('BRUTE_FORCE_DETECTED', alert_handler)
        
        for i in range(15):  # Exceed threshold
            monitor.log_auth_failure("target_user", "192.168.1.50", "Brute force attempt")
            time.sleep(0.01)
        
        time.sleep(0.2)  # Allow analysis
        
        assert len(alerts_triggered) > 0
        assert alerts_triggered[0].alert_type == 'BRUTE_FORCE_DETECTED'
        assert "192.168.1.50" in alerts_triggered[0].details
    
    def test_unusual_access_pattern_detection(self):
        """Test detection of unusual access patterns"""
        monitor = SecurityMonitor()
        anomalies_detected = []
        
        def anomaly_handler(anomaly):
            anomalies_detected.append(anomaly)
        
        monitor.add_anomaly_handler('UNUSUAL_ACCESS', anomaly_handler)
        
        for hour in range(9, 17):  # 9 AM to 5 PM
            monitor.log_access("normal_user", f"192.168.1.{hour}", hour)
        
        monitor.log_access("normal_user", "192.168.1.200", 3)
        time.sleep(0.1)
        
        assert len(anomalies_detected) > 0
        assert anomalies_detected[0].anomaly_type == 'UNUSUAL_ACCESS'
    
    def test_privilege_escalation_detection(self):
        """Test detection of privilege escalation attempts"""
        monitor = SecurityMonitor()
        escalation_attempts = []
        
        def escalation_handler(event):
            escalation_attempts.append(event)
        
        monitor.add_event_handler('PRIVILEGE_ESCALATION', escalation_handler)
        
        monitor.log_privilege_change("regular_user", "user", "admin", "192.168.1.75")
        time.sleep(0.1)
        
        assert len(escalation_attempts) == 1
        assert escalation_attempts[0].event_type == 'PRIVILEGE_ESCALATION'
        assert escalation_attempts[0].user_id == "regular_user"
    
    def test_data_exfiltration_detection(self):
        """Test detection of potential data exfiltration"""
        monitor = SecurityMonitor()
        exfiltration_alerts = []
        
        def exfiltration_handler(alert):
            exfiltration_alerts.append(alert)
        
        monitor.add_alert_handler('DATA_EXFILTRATION', exfiltration_handler)
        
        monitor.log_data_access("user123", "sensitive_dataset", 1024*1024*100)  # 100MB
        time.sleep(0.1)
        
        assert len(exfiltration_alerts) > 0
        assert exfiltration_alerts[0].alert_type == 'DATA_EXFILTRATION'
    
    def test_concurrent_event_processing(self):
        """Test concurrent security event processing"""
        monitor = SecurityMonitor()
        processed_events = []
        
        def event_processor(event):
            processed_events.append(event)
        
        monitor.add_event_handler('*', event_processor)  # Handle all events
        
        def generate_events(thread_id):
            for i in range(50):
                monitor.log_auth_success(f"user_{thread_id}_{i}", f"192.168.1.{thread_id}")
        
        threads = []
        for thread_id in range(5):
            thread = threading.Thread(target=generate_events, args=(thread_id,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        time.sleep(0.5)  # Allow processing
        
        assert len(processed_events) == 250
    
    def test_event_correlation(self):
        """Test correlation of related security events"""
        monitor = SecurityMonitor()
        correlated_incidents = []
        
        def correlation_handler(incident):
            correlated_incidents.append(incident)
        
        monitor.add_correlation_handler('COORDINATED_ATTACK', correlation_handler)
        
        attack_ips = ["192.168.1.100", "192.168.1.101", "192.168.1.102"]
        target_user = "high_value_target"
        
        for ip in attack_ips:
            for attempt in range(10):
                monitor.log_auth_failure(target_user, ip, "Coordinated attack")
                time.sleep(0.01)
        
        time.sleep(0.3)
        
        assert len(correlated_incidents) > 0
        assert correlated_incidents[0].incident_type == 'COORDINATED_ATTACK'
