import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AUTH_COOKIE_NAME } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

function extractJwtFromCookieOrHeader(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) {
    return fromHeader;
  }
  const cookieToken = req?.cookies?.[AUTH_COOKIE_NAME];
  return typeof cookieToken === 'string' && cookieToken.length > 0
    ? cookieToken
    : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('jwt.secret') ||
      configService.get<string>('JWT_SECRET') ||
      'eticket-jwt-secret-key-change-in-production-2026';

    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User belonging to this token no longer exists');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User account is suspended');
    }

    const { password, ...safeUser } = user;
    return safeUser;
  }
}
