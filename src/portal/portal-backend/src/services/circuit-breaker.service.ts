import { Injectable, Logger } from '@nestjs/common';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitBreakerStats>();
  private readonly configs = new Map<string, CircuitBreakerConfig>();

  constructor() {
    this.initializeDefaultCircuits();
  }

  private initializeDefaultCircuits(): void {
    this.registerCircuit('pqc-encryption', {
      failureThreshold: parseInt(process.env.PQC_FAILURE_THRESHOLD || '5'),
      resetTimeout: parseInt(process.env.PQC_RESET_TIMEOUT_MS || '60000'), // 1 minute
      monitoringWindow: parseInt(process.env.PQC_MONITORING_WINDOW_MS || '300000'), // 5 minutes
    });

    this.registerCircuit('pqc-signing', {
      failureThreshold: parseInt(process.env.PQC_SIGNING_FAILURE_THRESHOLD || '3'),
      resetTimeout: parseInt(process.env.PQC_SIGNING_RESET_TIMEOUT_MS || '30000'), // 30 seconds
      monitoringWindow: parseInt(process.env.PQC_SIGNING_MONITORING_WINDOW_MS || '180000'), // 3 minutes
    });

    this.registerCircuit('pqc-key-generation', {
      failureThreshold: parseInt(process.env.PQC_KEYGEN_FAILURE_THRESHOLD || '2'),
      resetTimeout: parseInt(process.env.PQC_KEYGEN_RESET_TIMEOUT_MS || '120000'), // 2 minutes
      monitoringWindow: parseInt(process.env.PQC_KEYGEN_MONITORING_WINDOW_MS || '600000'), // 10 minutes
    });
  }

  registerCircuit(name: string, config: CircuitBreakerConfig): void {
    this.configs.set(name, config);
    this.circuits.set(name, {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
    });
    
    this.logger.debug(`Registered circuit breaker: ${name} with config:`, config);
  }

  async executeWithCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);

    if (!circuit || !config) {
      throw new Error(`Circuit breaker not found: ${circuitName}`);
    }

    if (this.shouldRejectRequest(circuit, config)) {
      this.logger.warn(`Circuit breaker ${circuitName} is OPEN, rejecting request`);
      
      if (fallback) {
        this.logger.debug(`Executing fallback for circuit: ${circuitName}`);
        return await fallback();
      }
      
      throw new Error(`Circuit breaker ${circuitName} is OPEN - service temporarily unavailable`);
    }

    try {
      const result = await operation();
      this.recordSuccess(circuitName);
      return result;
    } catch (error) {
      this.recordFailure(circuitName);
      
      if (fallback && this.circuits.get(circuitName)?.state === CircuitState.OPEN) {
        this.logger.debug(`Circuit opened, executing fallback for: ${circuitName}`);
        return await fallback();
      }
      
      throw error;
    }
  }

  private shouldRejectRequest(circuit: CircuitBreakerStats, config: CircuitBreakerConfig): boolean {
    const now = new Date();

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return false;

      case CircuitState.OPEN:
        if (circuit.nextAttemptTime && now >= circuit.nextAttemptTime) {
          circuit.state = CircuitState.HALF_OPEN;
          this.logger.debug(`Circuit transitioning to HALF_OPEN state`);
          return false;
        }
        return true;

      case CircuitState.HALF_OPEN:
        return false;

      default:
        return false;
    }
  }

  private recordSuccess(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    circuit.successCount++;
    circuit.failureCount = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.CLOSED;
      this.logger.log(`Circuit breaker ${circuitName} transitioned to CLOSED state after successful operation`);
    }

    this.circuits.set(circuitName, circuit);
  }

  private recordFailure(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    const config = this.configs.get(circuitName);
    
    if (!circuit || !config) return;

    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    if (circuit.failureCount >= config.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttemptTime = new Date(Date.now() + config.resetTimeout);
      
      this.logger.warn(
        `Circuit breaker ${circuitName} OPENED after ${circuit.failureCount} failures. ` +
        `Next attempt allowed at: ${circuit.nextAttemptTime.toISOString()}`
      );
    }

    this.circuits.set(circuitName, circuit);
  }

  getCircuitStats(circuitName: string): CircuitBreakerStats | undefined {
    return this.circuits.get(circuitName);
  }

  getAllCircuitStats(): Map<string, CircuitBreakerStats> {
    return new Map(this.circuits);
  }

  resetCircuit(circuitName: string): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return;

    circuit.state = CircuitState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.lastFailureTime = undefined;
    circuit.nextAttemptTime = undefined;

    this.circuits.set(circuitName, circuit);
    this.logger.log(`Circuit breaker ${circuitName} has been manually reset`);
  }

  isCircuitOpen(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    return circuit?.state === CircuitState.OPEN;
  }

  getHealthStatus(): { healthy: string[]; unhealthy: string[]; halfOpen: string[] } {
    const healthy: string[] = [];
    const unhealthy: string[] = [];
    const halfOpen: string[] = [];

    for (const [name, circuit] of this.circuits.entries()) {
      switch (circuit.state) {
        case CircuitState.CLOSED:
          healthy.push(name);
          break;
        case CircuitState.OPEN:
          unhealthy.push(name);
          break;
        case CircuitState.HALF_OPEN:
          halfOpen.push(name);
          break;
      }
    }

    return { healthy, unhealthy, halfOpen };
  }
}
