import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';

export function sessionToken(request: FastifyRequest): string | undefined {
  return request.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith('eh_session='))?.slice('eh_session='.length);
}

export function assertOrigin(request: FastifyRequest): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origins = new Set([process.env.WEB_ORIGIN ?? 'http://localhost:3000', 'http://127.0.0.1:3000']);
  const origin = request.headers.origin;
  if ((origin && !origins.has(origin)) || request.headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException('허용되지 않은 요청 출처입니다.');
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    assertOrigin(request);
    request.user = this.auth.authenticate(sessionToken(request));
    if (request.headers['x-eh-account'] && request.headers['x-eh-account'] !== request.user.id) throw new UnauthorizedException('다른 탭에서 계정이 변경되었습니다. 다시 로그인해 주세요.');
    return true;
  }
}
