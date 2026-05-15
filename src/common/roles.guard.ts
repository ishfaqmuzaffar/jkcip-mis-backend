import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean canActivate(context: ExecutionContext): boolean {
  const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
  if (!requiredRoles) return true;
  const { user } = context.switchToHttp().getRequest();
  // SUPER_ADMIN bypasses all role restrictions
  if (user.role === 'SUPER_ADMIN') return true;
  return requiredRoles.some((role) => user.role === role);
}
}
