import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attaches `req.user` when a valid JWT cookie or Bearer token is present,
 * while allowing unauthenticated requests to proceed as anonymous (`req.user = null`).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(_err: unknown, user: TUser): TUser | null {
    return user || null;
  }
}
