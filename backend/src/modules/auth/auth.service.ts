import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as uuid from 'uuid';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { normalizeRoleName } from './utils/role-normalization.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
      include: { role: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Invalid credentials or inactive user');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sessionId = uuid.v4();
    const normalizedRole = normalizeRoleName(user.role.name || user.role.code);
    const tokens = await this.generateTokens(user.id, sessionId, normalizedRole);
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);

    await this.prisma.$transaction([
      this.prisma.userSession.create({
        data: {
          id: sessionId,
          user_id: user.id,
          device_id: loginDto.deviceId,
          device_name: loginDto.deviceName,
          device_type: loginDto.deviceType,
          device_profile: loginDto.deviceProfile,
          ip_address: ipAddress,
          user_agent: userAgent,
          last_seen_at: new Date(),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          user_name_snapshot: user.name,
          role_code_snapshot: user.role.code,
          entity: 'users',
          entity_id: user.id,
          action: 'LOGIN',
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          user_id: user.id,
          session_id: sessionId,
          token_hash: refreshTokenHash,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { last_login_at: new Date() },
      }),
    ]);

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: normalizedRole,
        roleCode: user.role.code,
      },
      ...tokens,
      sessionId,
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    // Basic verification of JWT (signature/expiry)
    let payload;
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { sub: userId, sid: sessionId } = payload;

    // Check refresh token in database (rotation/revocation check)
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        session_id: sessionId,
        revoked_at: null,
      },
    });

    if (!storedToken || storedToken.expires_at < new Date()) {
       throw new UnauthorizedException('Refresh token expired or revoked');
    }

    const isMatch = await bcrypt.compare(dto.refreshToken, storedToken.token_hash);
    if (!isMatch) {
      // Possible reuse attack! Revoke all tokens for this session
      await this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId },
        data: { revoked_at: new Date() },
      });
      throw new ForbiddenException('Refresh token reused - compromise detected');
    }

    // Generate new pair
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    
    if (!user || !user.active) {
      throw new UnauthorizedException('User inactive');
    }

    const tokens = await this.generateTokens(
      user.id,
      sessionId,
      normalizeRoleName(user.role.name || user.role.code),
    );

    // Rotate token (revoke old, create new)
    const newHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.$transaction([
       this.prisma.refreshToken.update({
         where: { id: storedToken.id },
         data: { revoked_at: new Date() },
       }),
       this.prisma.refreshToken.create({
         data: {
           user_id: user.id,
           session_id: sessionId,
           token_hash: newHash,
           expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
           rotated_from_token_id: storedToken.id,
         },
       }),
       this.prisma.userSession.update({
         where: { id: sessionId },
         data: { last_seen_at: new Date() },
       })
    ]);

    return tokens;
  }

  async logout(sessionId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: sessionId },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          session_id: sessionId,
          entity: 'users',
          entity_id: userId,
          action: 'LOGOUT',
        },
      }),
    ]);
  }

  private async generateTokens(userId: string, sessionId: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, sid: sessionId, role },
        {
          secret: this.configService.get('JWT_ACCESS_SECRET'),
          expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, sid: sessionId },
        {
          secret: this.configService.get('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async getSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: { user_id: userId, active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string) {
    const [result] = await this.prisma.$transaction([
      this.prisma.userSession.updateMany({
        where: { id: sessionId, user_id: userId },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { session_id: sessionId, user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          session_id: sessionId,
          entity: 'users',
          entity_id: userId,
          action: 'REVOKE_SESSION',
        },
      }),
    ]);

    return result;
  }

  async logoutAll(userId: string) {
    await this.prisma.$transaction([
      this.prisma.userSession.updateMany({
        where: { user_id: userId, active: true },
        data: { active: false, revoked_at: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: userId,
          entity: 'users',
          entity_id: userId,
          action: 'LOGOUT_ALL',
        },
      }),
    ]);

    return { message: 'All sessions revoked' };
  }
}
