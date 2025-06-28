import pytest
import json
import requests
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_monitoring_module import SIEMIntegration, SIEMConnector

class TestSIEMIntegration:
    
    def test_splunk_integration(self):
        """Test Splunk SIEM integration"""
        siem = SIEMIntegration('splunk')
        sent_events = []
        
        def mock_send_to_splunk(event_data):
            sent_events.append(event_data)
            return {'status': 'success', 'event_id': 'splunk_123'}
        
        siem.splunk_sender = mock_send_to_splunk
        
        event = {
            'timestamp': '2025-01-01T12:00:00Z',
            'event_type': 'AUTHENTICATION_FAILURE',
            'source_ip': '192.168.1.100',
            'user_id': 'test_user',
            'details': 'Invalid password attempt'
        }
        
        result = siem.send_event(event)
        
        assert result['status'] == 'success'
        assert len(sent_events) == 1
        assert sent_events[0]['event_type'] == 'AUTHENTICATION_FAILURE'
    
    def test_qradar_integration(self):
        """Test IBM QRadar SIEM integration"""
        siem = SIEMIntegration('qradar')
        sent_events = []
        
        def mock_send_to_qradar(event_data):
            sent_events.append(event_data)
            return {'status': 'accepted', 'reference_id': 'qradar_456'}
        
        siem.qradar_sender = mock_send_to_qradar
        
        event = {
            'timestamp': '2025-01-01T12:00:00Z',
            'event_type': 'BRUTE_FORCE_ATTACK',
            'source_ip': '192.168.1.200',
            'target_user': 'admin',
            'attack_count': 15
        }
        
        result = siem.send_event(event)
        
        assert result['status'] == 'accepted'
        assert len(sent_events) == 1
        assert sent_events[0]['event_type'] == 'BRUTE_FORCE_ATTACK'
    
    def test_arcsight_integration(self):
        """Test Micro Focus ArcSight SIEM integration"""
        siem = SIEMIntegration('arcsight')
        sent_events = []
        
        def mock_send_to_arcsight(event_data):
            sent_events.append(event_data)
            return {'status': 'received', 'correlation_id': 'arcsight_789'}
        
        siem.arcsight_sender = mock_send_to_arcsight
        
        event = {
            'timestamp': '2025-01-01T12:00:00Z',
            'event_type': 'PRIVILEGE_ESCALATION',
            'user_id': 'regular_user',
            'target_privilege': 'admin',
            'success': False
        }
        
        result = siem.send_event(event)
        
        assert result['status'] == 'received'
        assert len(sent_events) == 1
        assert sent_events[0]['event_type'] == 'PRIVILEGE_ESCALATION'
    
    def test_syslog_integration(self):
        """Test syslog integration for generic SIEM systems"""
        siem = SIEMIntegration('syslog')
        sent_logs = []
        
        def mock_send_syslog(message, facility, severity):
            sent_logs.append({
                'message': message,
                'facility': facility,
                'severity': severity
            })
            return True
        
        siem.syslog_sender = mock_send_syslog
        
        event = {
            'timestamp': '2025-01-01T12:00:00Z',
            'event_type': 'DATA_EXFILTRATION',
            'user_id': 'suspicious_user',
            'data_size': '100MB',
            'destination': 'external_server'
        }
        
        result = siem.send_event(event)
        
        assert result == True
        assert len(sent_logs) == 1
        assert 'DATA_EXFILTRATION' in sent_logs[0]['message']
    
    def test_event_format_conversion(self):
        """Test event format conversion for different SIEM systems"""
        siem = SIEMIntegration()
        
        standard_event = {
            'timestamp': '2025-01-01T12:00:00Z',
            'event_type': 'SECURITY_VIOLATION',
            'source_ip': '192.168.1.100',
            'user_id': 'test_user',
            'severity': 'HIGH',
            'description': 'Unauthorized access attempt'
        }
        
        splunk_event = siem.convert_to_splunk_format(standard_event)
        assert 'sourcetype' in splunk_event
        assert splunk_event['sourcetype'] == 'security_event'
        assert 'source' in splunk_event
        
        qradar_event = siem.convert_to_qradar_format(standard_event)
        assert 'EventTime' in qradar_event
        assert 'EventName' in qradar_event
        assert qradar_event['EventName'] == 'SECURITY_VIOLATION'
        
        arcsight_event = siem.convert_to_arcsight_format(standard_event)
        assert 'deviceEventClassId' in arcsight_event
        assert 'name' in arcsight_event
        assert arcsight_event['name'] == 'SECURITY_VIOLATION'
    
    def test_batch_event_processing(self):
        """Test batch processing of multiple events"""
        siem = SIEMIntegration('splunk')
        batch_events = []
        
        def mock_send_batch(events):
            batch_events.extend(events)
            return {'status': 'success', 'processed_count': len(events)}
        
        siem.batch_sender = mock_send_batch
        
        events = []
        for i in range(100):
            event = {
                'timestamp': f'2025-01-01T12:{i:02d}:00Z',
                'event_type': 'BATCH_TEST',
                'user_id': f'user_{i}',
                'details': f'Batch event {i}'
            }
            events.append(event)
        
        result = siem.send_batch(events)
        
        assert result['status'] == 'success'
        assert result['processed_count'] == 100
        assert len(batch_events) == 100
    
    def test_siem_connectivity_and_failover(self):
        """Test SIEM connectivity and failover mechanisms"""
        siem = SIEMIntegration()
        
        siem.configure_primary('splunk', 'https://primary-splunk.company.com')
        siem.configure_backup('qradar', 'https://backup-qradar.company.com')
        
        connection_attempts = []
        
        def mock_test_connection(siem_type, endpoint):
            connection_attempts.append({'type': siem_type, 'endpoint': endpoint})
            if siem_type == 'splunk':
                return False
            else:
                return True
        
        siem.connection_tester = mock_test_connection
        
        connectivity_status = siem.test_connectivity()
        
        assert len(connection_attempts) == 2
        assert connection_attempts[0]['type'] == 'splunk'
        assert connection_attempts[1]['type'] == 'qradar'
        assert connectivity_status['active_siem'] == 'qradar'
    
    def test_event_enrichment(self):
        """Test event enrichment before sending to SIEM"""
        siem = SIEMIntegration()
        
        basic_event = {
            'event_type': 'LOGIN_ATTEMPT',
            'user_id': 'john.doe',
            'source_ip': '192.168.1.100'
        }
        
        enriched_event = siem.enrich_event(basic_event)
        
        assert 'timestamp' in enriched_event
        assert 'event_id' in enriched_event
        assert 'source_hostname' in enriched_event
        assert 'geolocation' in enriched_event
        assert 'user_department' in enriched_event
        assert 'risk_score' in enriched_event
        
        if enriched_event['source_ip'].startswith('192.168'):
            assert enriched_event['geolocation']['type'] == 'internal'
    
    def test_compliance_reporting_integration(self):
        """Test compliance reporting integration with SIEM"""
        siem = SIEMIntegration()
        
        compliance_events = [
            {
                'event_type': 'GDPR_DATA_ACCESS',
                'user_id': 'data_processor',
                'data_subject': 'customer_123',
                'legal_basis': 'consent',
                'purpose': 'service_delivery'
            },
            {
                'event_type': 'SOX_FINANCIAL_ACCESS',
                'user_id': 'auditor',
                'financial_system': 'erp_system',
                'access_type': 'read_only'
            },
            {
                'event_type': 'HIPAA_PHI_ACCESS',
                'user_id': 'healthcare_worker',
                'patient_id': 'patient_456',
                'access_reason': 'treatment'
            }
        ]
        
        compliance_results = []
        for event in compliance_events:
            result = siem.send_compliance_event(event)
            compliance_results.append(result)
        
        assert len(compliance_results) == 3
        for result in compliance_results:
            assert result['compliance_tagged'] == True
            assert 'retention_period' in result
            assert 'audit_trail_id' in result
