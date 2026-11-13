import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const { method, originalUrl, ip } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode;
        const delay = Date.now() - now;
        this.logger.log(
          `[${method}] ${originalUrl} ${statusCode} - ${delay}ms - ${ip}`,
        );
      }),
    );
  }
}
