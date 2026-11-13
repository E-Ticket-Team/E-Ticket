import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const request = context.switchToHttp().getRequest();

    // If health endpoint, return raw response without wrapping
    if (request.url?.includes('/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
