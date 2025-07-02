// cryptoFallbackTelemetry.ts

import { TelemetryLogger } from './logger'


export enum FallbackReason {
  EXPIRED_CERT = 'expired_cert',
  INVALID_SIGNATURE = 'invalid_signature',
  ALGO_MISMATCH = 'algo_mismatch',
  CERT_NOT_FOUND = 'cert_not_found',
  MALFORMED_CERT = 'malformed_cert',
  UNSUPPORTED_PQC_ALG = 'unsupported_pqc_alg',
  UNKNOWN = 'unknown',
}

export interface CryptoFallbackEvent {
  userId: string
  deviceId?: string
  flowStage: 'validate' | 'register' | 'handshake'
  pqcAlgorithm?: string
  fallbackReason: FallbackReason
  timeMs?: number
  timestamp: string
}

export class CryptoFallbackTelemetry {
  static emit(event: CryptoFallbackEvent) {
    TelemetryLogger.trace('TRACE.PQC_FALLBACK_USED', {
      userId: event.userId,
      deviceId: event.deviceId ?? 'unknown',
      algorithm: event.pqcAlgorithm ?? 'unspecified',
      reason: event.fallbackReason,
      flowStage: event.flowStage,
      latencyMs: event.timeMs ?? -1,
      timestamp: event.timestamp,
    })
  }
}
