import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  buildIpThrottleTracker,
  buildLoginThrottleTracker,
  getAuthLoginThrottleBlockMs,
  getAuthLoginThrottleLimit,
  getAuthLoginThrottleTtlMs,
  getAuthRefreshThrottleBlockMs,
  getAuthRefreshThrottleLimit,
  getAuthRefreshThrottleTtlMs,
} from './auth-security.config';
import type { AuthenticatedRequest } from './auth.types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({
    default: {
      limit: () => getAuthLoginThrottleLimit(),
      ttl: () => getAuthLoginThrottleTtlMs(),
      blockDuration: () => getAuthLoginThrottleBlockMs(),
      getTracker: buildLoginThrottleTracker,
    },
  })
  @ApiOperation({ summary: 'Login and issue tokens' })
  @ApiResponse({ status: 200, description: 'Tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const userAgentHeader = req.headers['user-agent'];
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join(', ')
      : userAgentHeader || 'Unknown';
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Post('refresh-token')
  @Throttle({
    default: {
      limit: () => getAuthRefreshThrottleLimit(),
      ttl: () => getAuthRefreshThrottleTtlMs(),
      blockDuration: () => getAuthRefreshThrottleBlockMs(),
      getTracker: buildIpThrottleTracker,
    },
  })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens rotated' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({
    summary: 'Get the current authenticated user with effective permissions',
  })
  @ApiResponse({ status: 200, description: 'Current user session access data' })
  me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({ status: 200, description: 'Logged out from all sessions' })
  logoutAll(@Req() req: AuthenticatedRequest) {
    return this.authService.logoutAll(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'Get all active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  getSessions(@Req() req: AuthenticatedRequest) {
    return this.authService.getSessions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  revokeSession(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.authService.revokeSession(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke session' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@Req() req: AuthenticatedRequest) {
    const sessionId = req.user.sid;
    const userId = req.user.sub;
    if (!sessionId) {
      throw new UnauthorizedException('No active session found in token');
    }
    return this.authService.logout(sessionId, userId);
  }
}
