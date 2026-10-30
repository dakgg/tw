import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { assertOrigin, SessionGuard, sessionToken } from './auth.guard';
import type { AuthenticatedRequest } from './auth.types';

function setCookie(reply: FastifyReply, token: string, clear = false): void {
  reply.header('Set-Cookie', `eh_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 43200}${process.env.EH_COOKIE_SECURE === 'true' ? '; Secure' : ''}`);
  reply.header('Cache-Control', 'no-store');
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('config')
  config() { return { signupAllowed: process.env.EH_ALLOW_SIGNUP !== 'false' }; }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    reply.header('Cache-Control', 'no-store');
    return { user: request.user };
  }

  @Post('register')
  async register(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    assertOrigin(request);
    const result = await this.auth.register(body, request.ip);
    setCookie(reply, result.token);
    return { user: result.user };
  }

  @Post('login')
  async login(@Body() body: unknown, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    assertOrigin(request);
    const result = await this.auth.login(body, request.ip);
    setCookie(reply, result.token);
    return { user: result.user };
  }

  @Post('logout')
  logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    assertOrigin(request);
    this.auth.logout(sessionToken(request));
    setCookie(reply, '', true);
    return { loggedOut: true };
  }

  @Post('password')
  @UseGuards(SessionGuard)
  async password(@Body() body: unknown, @Req() request: AuthenticatedRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const token = await this.auth.changePassword(request.user.id, body);
    setCookie(reply, token);
    return { changed: true };
  }
}
