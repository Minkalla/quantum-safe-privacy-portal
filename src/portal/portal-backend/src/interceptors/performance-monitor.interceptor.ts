import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataAccessPerformanceService } from '../services/data-access-performance.service';

@Injectable()
export class PerformanceMonitorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceMonitorInterceptor.name);

  constructor(private readonly performanceService: DataAccessPerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const endpoint = `${request.method} ${request.path}`;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        this.logger.debug(`Performance metric: ${endpoint} - ${duration}ms`);

        if (request.path.includes('/pqc/')) {
          this.logger.log(`PQC API ${endpoint} - ${duration}ms`);

          if (duration > 2000) {
            this.logger.warn(`Very slow PQC API request: ${endpoint} took ${duration}ms`);
          } else if (duration > 1000) {
            this.logger.warn(`Slow PQC API request: ${endpoint} took ${duration}ms`);
          }
        }

        if (duration > 5000) {
          this.logger.error(`Critical performance issue: ${endpoint} took ${duration}ms`);
        }
      }),
    );
  }
}
