// src/portal/telemetry/logger.ts

export class TelemetryLogger {
  static trace(label: string, data: Record<string, any>) {
    console.log(`[${label}]`, JSON.stringify(data))
  }
}
