import { Test, TestingModule } from '@nestjs/testing';
import { MetricsCollectorService } from './metrics-collector.service';

describe('MetricsCollectorService', () => {
  let service: MetricsCollectorService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [MetricsCollectorService],
    }).compile();

    service = module.get<MetricsCollectorService>(MetricsCollectorService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordEvent', () => {
    it('should record metric events', () => {
      service.recordEvent('user123', 'exp1', 'treatment', 'response_time_ms', 150);
      
      const metrics = service.getExperimentMetrics('exp1');
      expect(metrics.treatment['response_time_ms']).toBeDefined();
      expect(metrics.treatment['response_time_ms'].count).toBe(1);
      expect(metrics.treatment['response_time_ms'].avg).toBe(150);
    });

    it('should aggregate multiple events correctly', () => {
      service.recordEvent('user1', 'exp1', 'treatment', 'response_time_ms', 100);
      service.recordEvent('user2', 'exp1', 'treatment', 'response_time_ms', 200);
      service.recordEvent('user3', 'exp1', 'treatment', 'response_time_ms', 300);
      
      const metrics = service.getExperimentMetrics('exp1');
      const responseTimeMetrics = metrics.treatment['response_time_ms'];
      
      expect(responseTimeMetrics.count).toBe(3);
      expect(responseTimeMetrics.sum).toBe(600);
      expect(responseTimeMetrics.avg).toBe(200);
      expect(responseTimeMetrics.min).toBe(100);
      expect(responseTimeMetrics.max).toBe(300);
    });

    it('should separate control and treatment metrics', () => {
      service.recordEvent('user1', 'exp1', 'control', 'response_time_ms', 100);
      service.recordEvent('user2', 'exp1', 'treatment', 'response_time_ms', 200);
      
      const metrics = service.getExperimentMetrics('exp1');
      
      expect(metrics.control['response_time_ms'].count).toBe(1);
      expect(metrics.control['response_time_ms'].avg).toBe(100);
      
      expect(metrics.treatment['response_time_ms'].count).toBe(1);
      expect(metrics.treatment['response_time_ms'].avg).toBe(200);
    });

    it('should hash user IDs for privacy', () => {
      service.recordEvent('sensitive-user-id', 'exp1', 'treatment', 'response_time_ms', 150);
      
      const events = service.getRecentEvents(10);
      expect(events[0].userId).not.toBe('sensitive-user-id');
      expect(events[0].userId).toHaveLength(16);
    });
  });

  describe('data retention', () => {
    it('should clear old events based on retention policy', () => {
      service.recordEvent('user1', 'exp1', 'treatment', 'response_time_ms', 100);
      
      const events = service.getRecentEvents(10);
      if (events.length > 0) {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 31);
        events[0].timestamp = oldDate;
      }
      
      service.clearOldEvents(30);
      
      const remainingEvents = service.getRecentEvents(10);
      expect(remainingEvents.length).toBe(0);
    });

    it('should keep recent events within retention period', () => {
      service.recordEvent('user1', 'exp1', 'treatment', 'response_time_ms', 100);
      
      service.clearOldEvents(30);
      
      const events = service.getRecentEvents(10);
      expect(events.length).toBe(1);
    });
  });

  describe('getRecentEvents', () => {
    it('should return limited number of recent events', () => {
      for (let i = 0; i < 150; i++) {
        service.recordEvent(`user${i}`, 'exp1', 'treatment', 'response_time_ms', i);
      }
      
      const events = service.getRecentEvents(100);
      expect(events.length).toBe(100);
    });
  });
});
