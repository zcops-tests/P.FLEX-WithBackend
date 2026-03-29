import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import type { AppConfig } from '../../../config/env.validation';
import type { AuthenticatedUser, JwtAccessPayload } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService<AppConfig, true>,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    // Basic check for session activity
    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sid },
    });

    if (!session || !session.active) {
      throw new UnauthorizedException('Session is inactive or revoked');
    }

    return {
      id: payload.sub,
      sub: payload.sub,
      sid: payload.sid,
      role: payload.role,
      roleCode: payload.roleCode,
    };
  }
}
