import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, REQUIRED_PRIVILEGES_KEY } from './decorators';

@Injectable()
export class ZorbitPrivilegeGuard implements CanActivate {
  private readonly logger = new Logger(ZorbitPrivilegeGuard.name);
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const handlerPrivs = this.reflector.get<string[]>(REQUIRED_PRIVILEGES_KEY, context.getHandler()) || [];
    const classPrivs = this.reflector.get<string[]>(REQUIRED_PRIVILEGES_KEY, context.getClass()) || [];
    const required = [...new Set([...handlerPrivs, ...classPrivs])];
    if (required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Authentication required');

    const userPrivs = new Set(user.privileges || []);
    const missing = required.filter(p => !userPrivs.has(p));
    if (missing.length > 0) {
      this.logger.warn(`User ${user.sub} denied: missing [${missing.join(', ')}]`);
      throw new ForbiddenException(`Insufficient privileges. Required: [${missing.join(', ')}]`);
    }
    return true;
  }
}
