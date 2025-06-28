from pqc_bindings import PQCLibraryV2, PerformanceMonitor

class FFIPerformanceMonitor:
    def __init__(self):
        self.lib = PQCLibraryV2()
        self.monitor = PerformanceMonitor(self.lib)
        self.monitoring_active = False
    
    def start_monitoring(self):
        """Start performance monitoring by resetting metrics."""
        self.monitor.reset_metrics()
        self.monitoring_active = True
    
    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.monitoring_active = False
    
    def get_performance_report(self) -> dict:
        """Get comprehensive performance report."""
        if not self.monitoring_active:
            return {"status": "monitoring not active"}
        
        return self.monitor.get_performance_report()
