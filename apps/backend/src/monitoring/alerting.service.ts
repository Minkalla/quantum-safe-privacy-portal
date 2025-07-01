import { Injectable, Logger } from '@nestjs/common';

interface AlertPayload {
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  metrics?: any;
  timestamp?: string;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  async sendAlert(alert: AlertPayload): Promise<void> {
    const alertWithTimestamp = {
      ...alert,
      timestamp: alert.timestamp || new Date().toISOString(),
    };

    this.logger.log(`ALERT [${alert.severity}]: ${alert.title} - ${alert.message}`);

    await Promise.all([
      this.sendSlackAlert(alertWithTimestamp),
      this.sendEmailAlert(alertWithTimestamp),
      this.logToAuditTrail(alertWithTimestamp),
    ]);
  }

  private async sendSlackAlert(alert: AlertPayload): Promise<void> {
    try {
      this.logger.log(`Slack alert would be sent: ${JSON.stringify(alert)}`);
    } catch (error) {
      this.logger.error('Failed to send Slack alert', error);
    }
  }

  private async sendEmailAlert(alert: AlertPayload): Promise<void> {
    try {
      this.logger.log(`Email alert would be sent: ${JSON.stringify(alert)}`);
    } catch (error) {
      this.logger.error('Failed to send email alert', error);
    }
  }

  private async logToAuditTrail(alert: AlertPayload): Promise<void> {
    try {
      this.logger.log(`Audit trail entry: ${JSON.stringify(alert)}`);
    } catch (error) {
      this.logger.error('Failed to log to audit trail', error);
    }
  }
}
