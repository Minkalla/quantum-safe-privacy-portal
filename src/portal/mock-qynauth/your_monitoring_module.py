import threading
import time
import json
import hashlib
import datetime
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from collections import defaultdict, deque
import logging

@dataclass
class SecurityEvent:
    event_type: str
    user_id: str
    source_ip: str
    timestamp: datetime.datetime
    details: str
    event_id: Optional[str] = None
    severity: str = "MEDIUM"

@dataclass
class Alert:
    alert_type: str
    severity: str
    message: str
    details: Optional[Dict] = None
    alert_id: Optional[str] = None
    timestamp: Optional[datetime.datetime] = None

@dataclass
class DashboardWidget:
    widget_id: str
    widget_type: str
    title: str
    data_source: str

class SecurityMonitor:
    """Security monitoring system for real-time event detection"""
    
    def __init__(self):
        self.event_handlers = defaultdict(list)
        self.alert_handlers = defaultdict(list)
        self.anomaly_handlers = defaultdict(list)
        self.correlation_handlers = defaultdict(list)
        self.events = deque(maxlen=10000)
        self.auth_failures = defaultdict(list)
        self.access_patterns = defaultdict(list)
        self.lock = threading.Lock()
        
    def add_event_handler(self, event_type: str, handler: Callable):
        """Add event handler for specific event type or '*' for all events"""
        self.event_handlers[event_type].append(handler)
    
    def add_alert_handler(self, alert_type: str, handler: Callable):
        """Add alert handler for specific alert type"""
        self.alert_handlers[alert_type].append(handler)
    
    def add_anomaly_handler(self, anomaly_type: str, handler: Callable):
        """Add anomaly handler for specific anomaly type"""
        self.anomaly_handlers[anomaly_type].append(handler)
    
    def add_correlation_handler(self, correlation_type: str, handler: Callable):
        """Add correlation handler for specific correlation type"""
        self.correlation_handlers[correlation_type].append(handler)
    
    def log_auth_failure(self, user_id: str, source_ip: str, reason: str):
        """Log authentication failure event"""
        event = SecurityEvent(
            event_type="AUTH_FAILURE",
            user_id=user_id,
            source_ip=source_ip,
            timestamp=datetime.datetime.now(),
            details=reason
        )
        self.process_event(event)
        
        with self.lock:
            self.auth_failures[source_ip].append({
                'user': user_id,
                'timestamp': time.time(),
                'reason': reason
            })
            
            recent_failures = [f for f in self.auth_failures[source_ip] 
                             if time.time() - f['timestamp'] < 300]  # 5 minutes
            
            if len(recent_failures) >= 10:
                alert = type('Alert', (), {
                    'alert_type': 'BRUTE_FORCE_DETECTED',
                    'details': f"Multiple failed attempts from {source_ip}"
                })()
                
                for handler in self.alert_handlers['BRUTE_FORCE_DETECTED']:
                    handler(alert)
    
    def log_auth_success(self, user_id: str, source_ip: str):
        """Log successful authentication"""
        event = SecurityEvent(
            event_type="AUTH_SUCCESS",
            user_id=user_id,
            source_ip=source_ip,
            timestamp=datetime.datetime.now(),
            details="Authentication successful"
        )
        self.process_event(event)
    
    def log_access(self, user_id: str, source_ip: str, hour: int):
        """Log access event with time analysis"""
        event = SecurityEvent(
            event_type="ACCESS",
            user_id=user_id,
            source_ip=source_ip,
            timestamp=datetime.datetime.now(),
            details=f"Access at hour {hour}"
        )
        self.process_event(event)
        
        if hour < 9 or hour > 17:
            anomaly = type('Anomaly', (), {
                'anomaly_type': 'UNUSUAL_ACCESS',
                'user_id': user_id,
                'source_ip': source_ip,
                'hour': hour
            })()
            
            for handler in self.anomaly_handlers['UNUSUAL_ACCESS']:
                handler(anomaly)
    
    def log_privilege_change(self, user_id: str, old_role: str, new_role: str, source_ip: str):
        """Log privilege escalation attempt"""
        event = SecurityEvent(
            event_type="PRIVILEGE_ESCALATION",
            user_id=user_id,
            source_ip=source_ip,
            timestamp=datetime.datetime.now(),
            details=f"Role change: {old_role} -> {new_role}"
        )
        self.process_event(event)
    
    def log_data_access(self, user_id: str, dataset: str, size_bytes: int):
        """Log data access with exfiltration detection"""
        event = SecurityEvent(
            event_type="DATA_ACCESS",
            user_id=user_id,
            source_ip="unknown",
            timestamp=datetime.datetime.now(),
            details=f"Accessed {dataset}, size: {size_bytes} bytes"
        )
        self.process_event(event)
        
        if size_bytes > 50 * 1024 * 1024:  # 50MB threshold
            alert = type('Alert', (), {
                'alert_type': 'DATA_EXFILTRATION',
                'user_id': user_id,
                'dataset': dataset,
                'size': size_bytes
            })()
            
            for handler in self.alert_handlers['DATA_EXFILTRATION']:
                handler(alert)
    
    def process_event(self, event: SecurityEvent):
        """Process security event and trigger handlers"""
        with self.lock:
            self.events.append(event)
        
        for handler in self.event_handlers[event.event_type]:
            handler(event)
        
        for handler in self.event_handlers['*']:
            handler(event)
        
        self._check_correlation(event)
    
    def _check_correlation(self, event: SecurityEvent):
        """Check for correlated events indicating coordinated attacks"""
        if event.event_type == "AUTH_FAILURE":
            recent_events = [e for e in list(self.events)[-100:] 
                           if e.event_type == "AUTH_FAILURE" and 
                           e.user_id == event.user_id and
                           (datetime.datetime.now() - e.timestamp).seconds < 300]
            
            unique_ips = set(e.source_ip for e in recent_events)
            if len(unique_ips) >= 3 and len(recent_events) >= 20:
                incident = type('Incident', (), {
                    'incident_type': 'COORDINATED_ATTACK',
                    'target_user': event.user_id,
                    'attacking_ips': list(unique_ips),
                    'event_count': len(recent_events)
                })()
                
                for handler in self.correlation_handlers['COORDINATED_ATTACK']:
                    handler(incident)
    
    def cleanup_old_events(self):
        """Clean up old events to manage memory"""
        cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=24)
        with self.lock:
            self.events = deque([e for e in self.events if e.timestamp > cutoff_time], maxlen=10000)

class AlertingSystem:
    """Alerting system for multi-channel notifications"""
    
    def __init__(self):
        self.email_sender = None
        self.sms_sender = None
        self.slack_sender = None
        self.escalation_handler = None
        self.send_handler = None
        self.delivery_handler = None
        self.escalation_rules = {}
        self.suppression_rules = {}
        self.filters = {}
        self.sent_alerts = []
        self.acknowledgments = {}
        self.alert_metrics = defaultdict(int)
        self.lock = threading.Lock()
    
    def send_alert(self, alert: Alert, recipients):
        """Send alert to specified recipients"""
        if isinstance(recipients, str):
            recipients = [recipients]
        
        if self._is_suppressed(alert):
            return
        
        if not self._passes_filters(alert, recipients):
            return
        
        with self.lock:
            self.sent_alerts.append(alert)
            self.alert_metrics['total_alerts'] += 1
            self.alert_metrics[f'by_type_{alert.alert_type}'] += 1
            self.alert_metrics[f'by_severity_{alert.severity}'] += 1
        
        if self.send_handler:
            self.send_handler(alert)
        
        if self.delivery_handler:
            for recipient in recipients:
                self.delivery_handler(alert, recipient)
    
    def send_sms_alert(self, alert: Alert, phone_numbers: List[str]):
        """Send SMS alert"""
        if self.sms_sender:
            self.sms_sender(phone_numbers, f"{alert.alert_type}: {alert.message}")
    
    def send_slack_alert(self, alert: Alert, channel: str):
        """Send Slack alert"""
        if self.slack_sender:
            self.slack_sender(channel, f"{alert.alert_type}: {alert.message}")
    
    def set_escalation_rule(self, severity: str, timeout_seconds: int):
        """Set escalation rule for alert severity"""
        self.escalation_rules[severity] = timeout_seconds
    
    def check_escalations(self, current_time: float):
        """Check for alerts that need escalation"""
        for alert in self.sent_alerts:
            if alert.severity in self.escalation_rules:
                timeout = self.escalation_rules[alert.severity]
                if current_time - time.time() > timeout:
                    if self.escalation_handler:
                        self.escalation_handler(alert, "ESCALATED")
    
    def set_suppression_rule(self, alert_type: str, timeout_seconds: int):
        """Set suppression rule to prevent alert spam"""
        self.suppression_rules[alert_type] = timeout_seconds
    
    def _is_suppressed(self, alert: Alert) -> bool:
        """Check if alert should be suppressed"""
        if alert.alert_type in self.suppression_rules:
            timeout = self.suppression_rules[alert.alert_type]
            recent_alerts = [a for a in self.sent_alerts 
                           if a.alert_type == alert.alert_type and
                           time.time() - time.time() < timeout]
            return len(recent_alerts) > 0
        return False
    
    def add_filter(self, channel: str, severity: List[str] = None, alert_types: List[str] = None):
        """Add filter for alert delivery"""
        self.filters[channel] = {
            'severity': severity or [],
            'alert_types': alert_types or []
        }
    
    def _passes_filters(self, alert: Alert, recipients) -> bool:
        """Check if alert passes configured filters"""
        for recipient in recipients:
            if recipient in self.filters:
                filter_config = self.filters[recipient]
                if filter_config['severity'] and alert.severity not in filter_config['severity']:
                    return False
                if filter_config['alert_types'] and alert.alert_type not in filter_config['alert_types']:
                    return False
        return True
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str):
        """Acknowledge an alert"""
        self.acknowledgments[alert_id] = {
            'acknowledged_by': acknowledged_by,
            'acknowledged_at': datetime.datetime.now()
        }
    
    def is_acknowledged(self, alert_id: str) -> bool:
        """Check if alert is acknowledged"""
        return alert_id in self.acknowledgments
    
    def get_acknowledgment(self, alert_id: str) -> Dict:
        """Get acknowledgment details"""
        return self.acknowledgments.get(alert_id, {})
    
    def get_alert_metrics(self, time_period: str) -> Dict:
        """Get alert metrics for specified time period"""
        metrics = {
            'total_alerts': self.alert_metrics['total_alerts'],
            'by_type': {},
            'by_severity': {}
        }
        
        for key, value in self.alert_metrics.items():
            if key.startswith('by_type_'):
                alert_type = key.replace('by_type_', '')
                metrics['by_type'][alert_type] = value
            elif key.startswith('by_severity_'):
                severity = key.replace('by_severity_', '')
                metrics['by_severity'][severity] = value
        
        return metrics

class LogAnalyzer:
    """Log analysis system for threat detection and anomaly detection"""
    
    def __init__(self):
        self.threat_handlers = []
        self.anomaly_handlers = []
        self.correlation_handlers = []
        self.baseline_patterns = {}
        self.processed_logs = []
        self.real_time_handlers = []
        self.monitoring_active = False
        
    def add_threat_handler(self, handler: Callable):
        """Add threat detection handler"""
        self.threat_handlers.append(handler)
    
    def add_anomaly_handler(self, handler: Callable):
        """Add anomaly detection handler"""
        self.anomaly_handlers.append(handler)
    
    def add_correlation_handler(self, handler: Callable):
        """Add correlation analysis handler"""
        self.correlation_handlers.append(handler)
    
    def add_real_time_handler(self, handler: Callable):
        """Add real-time monitoring handler"""
        self.real_time_handlers.append(handler)
    
    def parse_log_entry(self, log_entry: str) -> Dict:
        """Parse log entry into structured format"""
        parsed = {}
        
        if log_entry.strip().startswith('{'):
            try:
                parsed = json.loads(log_entry)
                return parsed
            except json.JSONDecodeError:
                pass
        
        parts = log_entry.split(' ')
        if len(parts) >= 4:
            parsed['timestamp'] = f"{parts[0]} {parts[1]}"
            parsed['level'] = parts[2]
            parsed['module'] = parts[3].strip('[]')
            parsed['message'] = ' '.join(parts[4:])
            
            if 'user=' in log_entry:
                user_part = log_entry.split('user=')[1].split(' ')[0]
                parsed['user'] = user_part
            
            if 'ip=' in log_entry:
                ip_part = log_entry.split('ip=')[1].split(' ')[0]
                parsed['ip'] = ip_part
        
        return parsed
    
    def analyze_log_entry(self, log_entry: str):
        """Analyze log entry for threats"""
        sql_patterns = ["'", "OR '1'='1'", "DROP TABLE", "UNION SELECT", "--"]
        for pattern in sql_patterns:
            if pattern in log_entry:
                threat = type('Threat', (), {
                    'threat_type': 'SQL_INJECTION',
                    'pattern': pattern,
                    'log_entry': log_entry
                })()
                
                for handler in self.threat_handlers:
                    handler(threat)
                break
    
    def process_log_entry(self, log_entry: str, source: str = 'default'):
        """Process log entry for analysis"""
        parsed = self.parse_log_entry(log_entry)
        parsed['source'] = source
        self.processed_logs.append(parsed)
        
        self.analyze_log_entry(log_entry)
        
        self._check_anomalies(parsed)
        
        self._check_correlations(parsed)
    
    def train_baseline(self, log_entries: List[str]):
        """Train baseline patterns for anomaly detection"""
        for entry in log_entries:
            parsed = self.parse_log_entry(entry)
            if 'timestamp' in parsed:
                hour = int(parsed['timestamp'].split(':')[0].split(' ')[-1])
                if 'business_hours' not in self.baseline_patterns:
                    self.baseline_patterns['business_hours'] = set()
                self.baseline_patterns['business_hours'].add(hour)
    
    def _check_anomalies(self, parsed_log: Dict):
        """Check for anomalies in log patterns"""
        if 'timestamp' in parsed_log and 'business_hours' in self.baseline_patterns:
            try:
                hour = int(parsed_log['timestamp'].split(':')[0].split(' ')[-1])
                if hour not in self.baseline_patterns['business_hours']:
                    anomaly = type('Anomaly', (), {
                        'anomaly_type': 'UNUSUAL_TIME',
                        'hour': hour,
                        'log_entry': parsed_log
                    })()
                    
                    for handler in self.anomaly_handlers:
                        handler(anomaly)
            except (ValueError, IndexError):
                pass
    
    def _check_correlations(self, parsed_log: Dict):
        """Check for correlated events across log sources"""
        if 'ip' in parsed_log:
            ip = parsed_log['ip']
            
            related_logs = [log for log in self.processed_logs[-100:] 
                          if log.get('ip') == ip]
            
            if len(related_logs) >= 5:
                sources = set(log.get('source', 'unknown') for log in related_logs)
                if len(sources) >= 2:
                    correlation = type('Correlation', (), {
                        'correlation_type': 'COORDINATED_ATTACK',
                        'involved_ips': [ip],
                        'sources': list(sources),
                        'event_count': len(related_logs)
                    })()
                    
                    for handler in self.correlation_handlers:
                        handler(correlation)
    
    def set_retention_policy(self, days: int):
        """Set log retention policy"""
        self.retention_days = days
    
    def apply_retention_policy(self, log_file_path: str, current_date: str) -> int:
        """Apply retention policy and archive old logs"""
        archived_count = 0
        try:
            with open(log_file_path, 'r') as f:
                lines = f.readlines()
            
            current_dt = datetime.datetime.strptime(current_date, '%Y-%m-%d')
            cutoff_dt = current_dt - datetime.timedelta(days=self.retention_days)
            
            for line in lines:
                if line.strip():
                    try:
                        log_date = line.split(' ')[0]
                        log_dt = datetime.datetime.strptime(log_date, '%Y-%m-%d')
                        if log_dt < cutoff_dt:
                            archived_count += 1
                    except (ValueError, IndexError):
                        pass
        except FileNotFoundError:
            pass
        
        return archived_count
    
    def get_logs_by_date_range(self, start_date: str, end_date: str) -> List[Dict]:
        """Get logs within date range"""
        start_dt = datetime.datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.datetime.strptime(end_date, '%Y-%m-%d')
        
        filtered_logs = []
        for log in self.processed_logs:
            if 'timestamp' in log:
                try:
                    log_date = log['timestamp'].split(' ')[0]
                    log_dt = datetime.datetime.strptime(log_date, '%Y-%m-%d')
                    if start_dt <= log_dt <= end_dt:
                        filtered_logs.append(log)
                except (ValueError, IndexError):
                    pass
        
        return filtered_logs
    
    def start_real_time_monitoring(self):
        """Start real-time log monitoring"""
        self.monitoring_active = True
    
    def stop_real_time_monitoring(self):
        """Stop real-time log monitoring"""
        self.monitoring_active = False
    
    def process_real_time_log(self, log_entry: str):
        """Process real-time log entry"""
        if not self.monitoring_active:
            return
        
        parsed = self.parse_log_entry(log_entry)
        
        if parsed.get('level') == 'CRITICAL':
            alert = type('Alert', (), {
                'severity': 'CRITICAL',
                'message': parsed.get('message', ''),
                'log_entry': log_entry
            })()
            
            for handler in self.real_time_handlers:
                handler(alert)

class ThreatDetector:
    """Specialized threat detection system"""
    
    def __init__(self):
        self.threat_handlers = []
    
    def add_threat_handler(self, handler: Callable):
        """Add threat detection handler"""
        self.threat_handlers.append(handler)
    
    def analyze_log_entry(self, log_entry: str):
        """Analyze log entry for threat patterns"""
        sql_patterns = ["'", "OR '1'='1'", "DROP TABLE", "UNION SELECT", "--", "';"]
        for pattern in sql_patterns:
            if pattern in log_entry:
                threat = type('Threat', (), {
                    'threat_type': 'SQL_INJECTION',
                    'pattern': pattern,
                    'log_entry': log_entry
                })()
                
                for handler in self.threat_handlers:
                    handler(threat)
                break

class SecurityDashboard:
    """Security dashboard for visualization and reporting"""
    
    def __init__(self):
        self.events = []
        self.widgets = []
        self.update_handlers = []
        self.real_time_enabled = False
        self.users = {}
        self.lock = threading.Lock()
    
    def add_event(self, event: Dict):
        """Add event to dashboard"""
        with self.lock:
            self.events.append(event)
        
        if self.real_time_enabled:
            update = {'event': event, 'timestamp': datetime.datetime.now()}
            for handler in self.update_handlers:
                handler(update)
    
    def get_metrics(self, time_period: str) -> Dict:
        """Get aggregated metrics for time period"""
        metrics = {
            'total_events': len(self.events),
            'by_type': defaultdict(int),
            'by_severity': defaultdict(int)
        }
        
        for event in self.events:
            metrics['by_type'][event['type']] += 1
            metrics['by_severity'][event['severity']] += 1
        
        return dict(metrics)
    
    def add_update_handler(self, handler: Callable):
        """Add real-time update handler"""
        self.update_handlers.append(handler)
    
    def enable_real_time_updates(self):
        """Enable real-time dashboard updates"""
        self.real_time_enabled = True
    
    def add_widget(self, widget: DashboardWidget):
        """Add widget to dashboard"""
        self.widgets.append(widget)
    
    def get_widgets(self) -> List[DashboardWidget]:
        """Get all dashboard widgets"""
        return self.widgets
    
    def filter_events(self, **filters) -> List[Dict]:
        """Filter events by specified criteria"""
        filtered = []
        for event in self.events:
            match = True
            for key, value in filters.items():
                if key in event and event[key] != value:
                    match = False
                    break
            if match:
                filtered.append(event)
        return filtered
    
    def search_events(self, query: str) -> List[Dict]:
        """Search events by query string"""
        results = []
        for event in self.events:
            event_str = json.dumps(event).lower()
            if query.lower() in event_str:
                results.append(event)
        return results
    
    def export_data(self, format_type: str, time_range: str) -> str:
        """Export dashboard data in specified format"""
        if format_type == 'json':
            export_data = {
                'events': self.events,
                'metadata': {
                    'export_time': datetime.datetime.now().isoformat(),
                    'time_range': time_range,
                    'total_events': len(self.events)
                }
            }
            return json.dumps(export_data, indent=2)
        
        elif format_type == 'csv':
            if not self.events:
                return "type,severity,timestamp\n"
            
            headers = set()
            for event in self.events:
                headers.update(event.keys())
            
            csv_lines = [','.join(sorted(headers))]
            for event in self.events:
                row = [str(event.get(header, '')) for header in sorted(headers)]
                csv_lines.append(','.join(row))
            
            return '\n'.join(csv_lines)
        
        return ""
    
    def export_report(self, format_type: str, time_range: str) -> bytes:
        """Export dashboard report in specified format"""
        if format_type == 'pdf':
            report_content = f"Security Dashboard Report\nTime Range: {time_range}\nTotal Events: {len(self.events)}"
            return report_content.encode('utf-8')
        
        return b""
    
    def add_user(self, username: str, role: str):
        """Add user with specified role"""
        self.users[username] = {'role': role}
    
    def get_user_permissions(self, username: str) -> Dict:
        """Get user permissions based on role"""
        user = self.users.get(username, {})
        role = user.get('role', 'unknown')
        
        permissions = {
            'can_view_all': False,
            'can_export': False,
            'can_configure': False
        }
        
        if role == 'administrator':
            permissions = {
                'can_view_all': True,
                'can_export': True,
                'can_configure': True
            }
        elif role == 'security_analyst':
            permissions = {
                'can_view_all': True,
                'can_export': True,
                'can_configure': False
            }
        elif role == 'read_only':
            permissions = {
                'can_view_all': False,
                'can_export': False,
                'can_configure': False
            }
        
        return permissions

class SIEMIntegration:
    """SIEM integration for external security platforms"""
    
    def __init__(self, siem_type: str = None):
        self.siem_type = siem_type
        self.splunk_sender = None
        self.qradar_sender = None
        self.arcsight_sender = None
        self.syslog_sender = None
        self.batch_sender = None
        self.connection_tester = None
        self.primary_siem = None
        self.backup_siem = None
        
    def send_event(self, event: Dict) -> Dict:
        """Send event to configured SIEM system"""
        if self.siem_type == 'splunk' and self.splunk_sender:
            return self.splunk_sender(event)
        elif self.siem_type == 'qradar' and self.qradar_sender:
            return self.qradar_sender(event)
        elif self.siem_type == 'arcsight' and self.arcsight_sender:
            return self.arcsight_sender(event)
        elif self.siem_type == 'syslog' and self.syslog_sender:
            message = json.dumps(event)
            result = self.syslog_sender(message, 'security', 'high')
            return result
        
        return {'status': 'error', 'message': 'No SIEM configured'}
    
    def convert_to_splunk_format(self, event: Dict) -> Dict:
        """Convert event to Splunk format"""
        splunk_event = event.copy()
        splunk_event['sourcetype'] = 'security_event'
        splunk_event['source'] = 'pqc_security_monitor'
        return splunk_event
    
    def convert_to_qradar_format(self, event: Dict) -> Dict:
        """Convert event to QRadar format"""
        qradar_event = {
            'EventTime': event.get('timestamp'),
            'EventName': event.get('event_type'),
            'SourceIP': event.get('source_ip'),
            'UserID': event.get('user_id'),
            'Severity': event.get('severity', 'MEDIUM')
        }
        return qradar_event
    
    def convert_to_arcsight_format(self, event: Dict) -> Dict:
        """Convert event to ArcSight format"""
        arcsight_event = {
            'deviceEventClassId': event.get('event_type'),
            'name': event.get('event_type'),
            'sourceAddress': event.get('source_ip'),
            'sourceUserId': event.get('user_id'),
            'deviceSeverity': event.get('severity', 'MEDIUM')
        }
        return arcsight_event
    
    def send_batch(self, events: List[Dict]) -> Dict:
        """Send batch of events"""
        if self.batch_sender:
            return self.batch_sender(events)
        return {'status': 'error', 'message': 'No batch sender configured'}
    
    def configure_primary(self, siem_type: str, endpoint: str):
        """Configure primary SIEM system"""
        self.primary_siem = {'type': siem_type, 'endpoint': endpoint}
    
    def configure_backup(self, siem_type: str, endpoint: str):
        """Configure backup SIEM system"""
        self.backup_siem = {'type': siem_type, 'endpoint': endpoint}
    
    def test_connectivity(self) -> Dict:
        """Test SIEM connectivity with failover"""
        if not self.connection_tester:
            return {'status': 'error', 'message': 'No connection tester configured'}
        
        if self.primary_siem:
            if self.connection_tester(self.primary_siem['type'], self.primary_siem['endpoint']):
                return {'status': 'connected', 'active_siem': self.primary_siem['type']}
        
        if self.backup_siem:
            if self.connection_tester(self.backup_siem['type'], self.backup_siem['endpoint']):
                return {'status': 'connected', 'active_siem': self.backup_siem['type']}
        
        return {'status': 'failed', 'message': 'No SIEM systems available'}
    
    def enrich_event(self, event: Dict) -> Dict:
        """Enrich event with additional context"""
        enriched = event.copy()
        
        if 'timestamp' not in enriched:
            enriched['timestamp'] = datetime.datetime.now().isoformat()
        
        if 'event_id' not in enriched:
            enriched['event_id'] = hashlib.md5(json.dumps(event, sort_keys=True).encode()).hexdigest()
        
        if 'source_ip' in enriched:
            enriched['source_hostname'] = f"host-{enriched['source_ip'].replace('.', '-')}"
        
        if 'source_ip' in enriched:
            if enriched['source_ip'].startswith('192.168'):
                enriched['geolocation'] = {'type': 'internal', 'location': 'corporate_network'}
            else:
                enriched['geolocation'] = {'type': 'external', 'location': 'unknown'}
        
        if 'user_id' in enriched:
            enriched['user_department'] = 'IT' if 'admin' in enriched['user_id'] else 'General'
        
        risk_score = 1
        if enriched.get('event_type') in ['BRUTE_FORCE_ATTACK', 'PRIVILEGE_ESCALATION']:
            risk_score = 8
        elif enriched.get('event_type') in ['AUTH_FAILURE', 'DATA_ACCESS']:
            risk_score = 5
        enriched['risk_score'] = risk_score
        
        return enriched
    
    def send_compliance_event(self, event: Dict) -> Dict:
        """Send compliance-related event with special handling"""
        enriched_event = self.enrich_event(event)
        
        enriched_event['compliance_tagged'] = True
        
        if 'GDPR' in event.get('event_type', ''):
            enriched_event['retention_period'] = '7_years'
        elif 'SOX' in event.get('event_type', ''):
            enriched_event['retention_period'] = '7_years'
        elif 'HIPAA' in event.get('event_type', ''):
            enriched_event['retention_period'] = '6_years'
        else:
            enriched_event['retention_period'] = '3_years'
        
        enriched_event['audit_trail_id'] = f"audit_{int(time.time())}_{hash(json.dumps(event)) % 10000}"
        
        result = self.send_event(enriched_event)
        result['compliance_tagged'] = True
        result['retention_period'] = enriched_event['retention_period']
        result['audit_trail_id'] = enriched_event['audit_trail_id']
        
        return result

class SIEMConnector:
    """Base SIEM connector class"""
    
    def __init__(self, siem_type: str):
        self.siem_type = siem_type
    
    def connect(self) -> bool:
        """Connect to SIEM system"""
        return True
    
    def send_event(self, event: Dict) -> Dict:
        """Send event to SIEM"""
        return {'status': 'success', 'event_id': f'{self.siem_type}_{int(time.time())}'}
