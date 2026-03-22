import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'dev-secret',
    });
  }

  async validate(payload: any) {
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
    };
  }
}
