import pytest
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from your_monitoring_module import SecurityDashboard, DashboardWidget

class TestSecurityDashboard:
    
    def test_dashboard_data_aggregation(self):
        """Test dashboard data aggregation and metrics"""
        dashboard = SecurityDashboard()
        
        events = [
            {'type': 'AUTH_FAILURE', 'severity': 'MEDIUM', 'timestamp': '2025-01-01T12:00:00Z'},
            {'type': 'BRUTE_FORCE', 'severity': 'HIGH', 'timestamp': '2025-01-01T12:01:00Z'},
            {'type': 'DATA_ACCESS', 'severity': 'LOW', 'timestamp': '2025-01-01T12:02:00Z'},
            {'type': 'AUTH_FAILURE', 'severity': 'MEDIUM', 'timestamp': '2025-01-01T12:03:00Z'},
            {'type': 'PRIVILEGE_ESCALATION', 'severity': 'HIGH', 'timestamp': '2025-01-01T12:04:00Z'},
        ]
        
        for event in events:
            dashboard.add_event(event)
        
        metrics = dashboard.get_metrics('1h')
        
        assert metrics['total_events'] == 5
        assert metrics['by_type']['AUTH_FAILURE'] == 2
        assert metrics['by_type']['BRUTE_FORCE'] == 1
        assert metrics['by_severity']['HIGH'] == 2
        assert metrics['by_severity']['MEDIUM'] == 2
        assert metrics['by_severity']['LOW'] == 1
    
    def test_real_time_dashboard_updates(self):
        """Test real-time dashboard updates"""
        dashboard = SecurityDashboard()
        updates_received = []
        
        def update_handler(update):
            updates_received.append(update)
        
        dashboard.add_update_handler(update_handler)
        
        dashboard.enable_real_time_updates()
        
        new_events = [
            {'type': 'SYSTEM_ERROR', 'severity': 'LOW', 'timestamp': '2025-01-01T13:00:00Z'},
            {'type': 'SECURITY_BREACH', 'severity': 'CRITICAL', 'timestamp': '2025-01-01T13:01:00Z'},
        ]
        
        for event in new_events:
            dashboard.add_event(event)
        
        assert len(updates_received) == 2
        assert updates_received[1]['event']['type'] == 'SECURITY_BREACH'
        assert updates_received[1]['event']['severity'] == 'CRITICAL'
    
    def test_custom_dashboard_widgets(self):
        """Test custom dashboard widget creation"""
        dashboard = SecurityDashboard()
        
        threat_widget = DashboardWidget(
            widget_id='threat_level',
            widget_type='gauge',
            title='Current Threat Level',
            data_source='threat_calculator'
        )
        dashboard.add_widget(threat_widget)
        
        attackers_widget = DashboardWidget(
            widget_id='top_attackers',
            widget_type='table',
            title='Top Attack Sources',
            data_source='attacker_statistics'
        )
        dashboard.add_widget(attackers_widget)
        
        widgets = dashboard.get_widgets()
        assert len(widgets) == 2
        assert 'threat_level' in [w.widget_id for w in widgets]
        assert 'top_attackers' in [w.widget_id for w in widgets]
    
    def test_dashboard_filtering_and_search(self):
        """Test dashboard filtering and search functionality"""
        dashboard = SecurityDashboard()
        
        events = [
            {'type': 'AUTH_FAILURE', 'user': 'alice', 'ip': '192.168.1.100', 'timestamp': '2025-01-01T12:00:00Z'},
            {'type': 'DATA_ACCESS', 'user': 'bob', 'ip': '192.168.1.101', 'timestamp': '2025-01-01T12:01:00Z'},
            {'type': 'AUTH_FAILURE', 'user': 'charlie', 'ip': '192.168.1.100', 'timestamp': '2025-01-01T12:02:00Z'},
            {'type': 'PRIVILEGE_ESCALATION', 'user': 'alice', 'ip': '192.168.1.102', 'timestamp': '2025-01-01T12:03:00Z'},
        ]
        
        for event in events:
            dashboard.add_event(event)
        
        auth_events = dashboard.filter_events(type='AUTH_FAILURE')
        assert len(auth_events) == 2
        
        alice_events = dashboard.filter_events(user='alice')
        assert len(alice_events) == 2
        
        ip_100_events = dashboard.filter_events(ip='192.168.1.100')
        assert len(ip_100_events) == 2
        
        search_results = dashboard.search_events('alice')
        assert len(search_results) == 2
    
    def test_dashboard_export_functionality(self):
        """Test dashboard export functionality"""
        dashboard = SecurityDashboard()
        
        events = [
            {'type': 'SECURITY_ALERT', 'severity': 'HIGH', 'timestamp': '2025-01-01T12:00:00Z'},
            {'type': 'SYSTEM_WARNING', 'severity': 'MEDIUM', 'timestamp': '2025-01-01T12:01:00Z'},
        ]
        
        for event in events:
            dashboard.add_event(event)
        
        json_export = dashboard.export_data('json', time_range='1h')
        exported_data = json.loads(json_export)
        assert 'events' in exported_data
        assert len(exported_data['events']) == 2
        assert 'metadata' in exported_data
        
        csv_export = dashboard.export_data('csv', time_range='1h')
        assert 'type,severity,timestamp' in csv_export
        assert 'SECURITY_ALERT,HIGH' in csv_export
        
        pdf_export = dashboard.export_report('pdf', time_range='1h')
        assert pdf_export is not None
        assert len(pdf_export) > 0  # PDF should have content
    
    def test_dashboard_performance_with_large_datasets(self):
        """Test dashboard performance with large datasets"""
        dashboard = SecurityDashboard()
        
        import time
        start_time = time.time()
        
        for i in range(10000):
            event = {
                'type': f'EVENT_TYPE_{i % 10}',
                'severity': ['LOW', 'MEDIUM', 'HIGH'][i % 3],
                'user': f'user_{i % 100}',
                'timestamp': f'2025-01-01T{12 + (i // 3600):02d}:{(i % 3600) // 60:02d}:{i % 60:02d}Z'
            }
            dashboard.add_event(event)
        
        load_time = time.time() - start_time
        
        assert load_time < 5.0
        
        query_start = time.time()
        filtered_events = dashboard.filter_events(severity='HIGH')
        query_time = time.time() - query_start
        
        assert query_time < 1.0
        
        assert len(filtered_events) == 10000 // 3  # Every 3rd event is HIGH
    
    def test_dashboard_user_permissions(self):
        """Test dashboard user permissions and access control"""
        dashboard = SecurityDashboard()
        
        dashboard.add_user('admin', role='administrator')
        dashboard.add_user('analyst', role='security_analyst')
        dashboard.add_user('viewer', role='read_only')
        
        admin_permissions = dashboard.get_user_permissions('admin')
        assert admin_permissions['can_view_all'] == True
        assert admin_permissions['can_export'] == True
        assert admin_permissions['can_configure'] == True
        
        analyst_permissions = dashboard.get_user_permissions('analyst')
        assert analyst_permissions['can_view_all'] == True
        assert analyst_permissions['can_export'] == True
        assert analyst_permissions['can_configure'] == False
        
        viewer_permissions = dashboard.get_user_permissions('viewer')
        assert viewer_permissions['can_view_all'] == False
        assert viewer_permissions['can_export'] == False
        assert viewer_permissions['can_configure'] == False
