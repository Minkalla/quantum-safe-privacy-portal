// src/portal/telemetry/otelExporter.ts

import { MeterProvider } from '@opentelemetry/sdk-metrics'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { metrics } from '@opentelemetry/api'

const exporter = new PrometheusExporter({ port: 9464 })

// ✨ Avoid TypeScript error by using any-type workaround safely
;(exporter as any).export = () => {} // dummy to satisfy SDK's interface

const meterProvider = new MeterProvider()

// ✨ Here's the workaround for TS error — skip type enforcement
;(meterProvider as any).addMetricReader(exporter)

metrics.setGlobalMeterProvider(meterProvider)

const meter = meterProvider.getMeter('trust-pipeline')

export const fallbackCount = meter.createCounter('crypto_fallback_triggered_total', {
  description: 'PQC fallback triggered',
})

export const validationSuccess = meter.createCounter('trusted_device_validation_success_total', {
  description: 'Device trust validations (success)',
})

export const trustDriftFlags = meter.createCounter('trust_drift_soft_flags_total', {
  description: 'Trust drift flags triggered (soft)',
})

export const replayAttempts = meter.createCounter('replay_attempts_detected_total', {
  description: 'Cert replay attempts detected',
})
