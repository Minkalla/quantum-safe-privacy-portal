import pytest
import time
import json
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_monitoring_module import AlertingSystem, Alert

class TestAlertingSystem:
    
    def test_email_alert_delivery(self):
        """Test email alert delivery"""
        alerting = AlertingSystem()
        sent_emails = []
        
        def mock_send_email(to, subject, body):
            sent_emails.append({'to': to, 'subject': subject, 'body': body})
            return True
        
        alerting.email_sender = mock_send_email
        
        alert = Alert(
            alert_type='SECURITY_BREACH',
            severity='HIGH',
            message='Unauthorized access detected',
            details={'ip': '192.168.1.100', 'user': 'attacker'}
        )
        
        alerting.send_alert(alert, ['admin@company.com'])
        
        assert len(sent_emails) == 1
        assert sent_emails[0]['to'] == ['admin@company.com']
        assert 'SECURITY_BREACH' in sent_emails[0]['subject']
        assert 'Unauthorized access detected' in sent_emails[0]['body']
    
    def test_sms_alert_delivery(self):
        """Test SMS alert delivery"""
        alerting = AlertingSystem()
        sent_sms = []
        
        def mock_send_sms(to, message):
            sent_sms.append({'to': to, 'message': message})
            return True
        
        alerting.sms_sender = mock_send_sms
        
        alert = Alert(
            alert_type='SYSTEM_COMPROMISE',
            severity='CRITICAL',
            message='System compromise detected - immediate action required'
        )
        
        alerting.send_sms_alert(alert, ['+1234567890'])
        
        assert len(sent_sms) == 1
        assert sent_sms[0]['to'] == ['+1234567890']
        assert 'SYSTEM_COMPROMISE' in sent_sms[0]['message']
    
    def test_slack_integration(self):
        """Test Slack integration for alerts"""
        alerting = AlertingSystem()
        slack_messages = []
        
        def mock_send_slack(channel, message, attachments=None):
            slack_messages.append({
                'channel': channel,
                'message': message,
                'attachments': attachments
            })
            return True
        
        alerting.slack_sender = mock_send_slack
        
        alert = Alert(
            alert_type='PERFORMANCE_DEGRADATION',
            severity='MEDIUM',
            message='Authentication latency increased to 500ms'
        )
        
        alerting.send_slack_alert(alert, '#security-alerts')
        
        assert len(slack_messages) == 1
        assert slack_messages[0]['channel'] == '#security-alerts'
        assert 'PERFORMANCE_DEGRADATION' in slack_messages[0]['message']
    
    def test_alert_escalation(self):
        """Test alert escalation procedures"""
        alerting = AlertingSystem()
        escalation_log = []
        
        def mock_escalate(alert, level):
            escalation_log.append({'alert': alert, 'level': level})
        
        alerting.escalation_handler = mock_escalate
        
        alert = Alert(
            alert_type='DATA_BREACH',
            severity='HIGH',
            message='Sensitive data accessed by unauthorized user'
        )
        
        alerting.set_escalation_rule('HIGH', 300)  # 5 minutes
        
        alerting.send_alert(alert, ['security@company.com'])
        
        alerting.check_escalations(current_time=time.time() + 310)
        
        assert len(escalation_log) > 0
        assert escalation_log[0]['alert'].alert_type == 'DATA_BREACH'
    
    def test_alert_suppression(self):
        """Test alert suppression to prevent spam"""
        alerting = AlertingSystem()
        sent_alerts = []
        
        def mock_send(alert):
            sent_alerts.append(alert)
        
        alerting.send_handler = mock_send
        
        alerting.set_suppression_rule('BRUTE_FORCE', 3600)  # 1 hour
        
        for i in range(5):
            alert = Alert(
                alert_type='BRUTE_FORCE',
                severity='MEDIUM',
                message=f'Brute force attempt #{i+1}'
            )
            alerting.send_alert(alert, ['security@company.com'])
        
        assert len(sent_alerts) == 1
        assert sent_alerts[0].alert_type == 'BRUTE_FORCE'
    
    def test_alert_filtering(self):
        """Test alert filtering based on severity and type"""
        alerting = AlertingSystem()
        delivered_alerts = []
        
        def mock_deliver(alert, channel):
            delivered_alerts.append({'alert': alert, 'channel': channel})
        
        alerting.delivery_handler = mock_deliver
        
        alerting.add_filter('email', severity=['HIGH', 'CRITICAL'])
        
        severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
        for severity in severities:
            alert = Alert(
                alert_type='TEST_ALERT',
                severity=severity,
                message=f'Test alert with {severity} severity'
            )
            alerting.send_alert(alert, 'email')
        
        assert len(delivered_alerts) == 2
        delivered_severities = [a['alert'].severity for a in delivered_alerts]
        assert 'HIGH' in delivered_severities
        assert 'CRITICAL' in delivered_severities
        assert 'LOW' not in delivered_severities
        assert 'MEDIUM' not in delivered_severities
    
    def test_alert_acknowledgment(self):
        """Test alert acknowledgment system"""
        alerting = AlertingSystem()
        
        alert = Alert(
            alert_id='alert_001',
            alert_type='SECURITY_INCIDENT',
            severity='HIGH',
            message='Security incident requires attention'
        )
        
        alerting.send_alert(alert, ['security@company.com'])
        
        assert not alerting.is_acknowledged('alert_001')
        
        alerting.acknowledge_alert('alert_001', 'admin@company.com')
        
        assert alerting.is_acknowledged('alert_001')
        
        ack_info = alerting.get_acknowledgment('alert_001')
        assert ack_info['acknowledged_by'] == 'admin@company.com'
        assert ack_info['acknowledged_at'] is not None
    
    def test_alert_metrics_collection(self):
        """Test collection of alert metrics"""
        alerting = AlertingSystem()
        
        alert_types = ['BRUTE_FORCE', 'DATA_BREACH', 'SYSTEM_ERROR', 'BRUTE_FORCE']
        severities = ['MEDIUM', 'HIGH', 'LOW', 'MEDIUM']
        
        for alert_type, severity in zip(alert_types, severities):
            alert = Alert(
                alert_type=alert_type,
                severity=severity,
                message=f'Test {alert_type} alert'
            )
            alerting.send_alert(alert, ['admin@company.com'])
        
        metrics = alerting.get_alert_metrics(time_period='1h')
        
        assert metrics['total_alerts'] == 4
        assert metrics['by_type']['BRUTE_FORCE'] == 2
        assert metrics['by_type']['DATA_BREACH'] == 1
        assert metrics['by_severity']['HIGH'] == 1
        assert metrics['by_severity']['MEDIUM'] == 2
