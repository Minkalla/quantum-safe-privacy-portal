import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface AuditEvent {
  timestamp: string;
  eventType: string;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);
  private readonly auditDir = join(process.cwd(), 'monitoring', 'audit');

  constructor() {
    this.ensureAuditDirectoryExists();
  }

  private ensureAuditDirectoryExists(): void {
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
      this.logger.log(`Created audit directory: ${this.auditDir}`);
    }
  }

  async logEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const auditFile = join(this.auditDir, `audit-${new Date().toISOString().split('T')[0]}.jsonl`);
    const auditLine = JSON.stringify(auditEvent) + '\n';

    try {
      writeFileSync(auditFile, auditLine, { flag: 'a' });
      this.logger.debug(`Audit event logged: ${event.eventType} - ${event.action}`);
    } catch (error) {
      this.logger.error('Failed to write audit event', error);
    }
  }

  async logAuthentication(userId: string, outcome: 'SUCCESS' | 'FAILURE', details: any): Promise<void> {
    await this.logEvent({
      eventType: 'AUTHENTICATION',
      userId,
      action: 'LOGIN_ATTEMPT',
      resource: 'AUTH_ENDPOINT',
      outcome,
      details,
    });
  }

  async logKeyGeneration(userId: string, algorithm: string, outcome: 'SUCCESS' | 'FAILURE'): Promise<void> {
    await this.logEvent({
      eventType: 'KEY_GENERATION',
      userId,
      action: 'GENERATE_KEYPAIR',
      resource: `PQC_${algorithm}`,
      outcome,
      details: { algorithm },
    });
  }

  async logPerformanceAnomaly(anomalies: string[], metrics: any): Promise<void> {
    await this.logEvent({
      eventType: 'PERFORMANCE_ANOMALY',
      action: 'ANOMALY_DETECTED',
      resource: 'PERFORMANCE_MONITOR',
      outcome: 'WARNING',
      details: { anomalies, metrics },
    });
  }

  async logRollback(reason: string, details: any): Promise<void> {
    await this.logEvent({
      eventType: 'SYSTEM_ROLLBACK',
      action: 'AUTOMATED_ROLLBACK',
      resource: 'DEPLOYMENT',
      outcome: 'SUCCESS',
      details: { reason, ...details },
    });
  }

  async logSecurityEvent(eventType: string, details: any, outcome: 'SUCCESS' | 'FAILURE' | 'WARNING'): Promise<void> {
    await this.logEvent({
      eventType: 'SECURITY_EVENT',
      action: eventType,
      resource: 'SECURITY_MONITOR',
      outcome,
      details,
    });
  }
}
