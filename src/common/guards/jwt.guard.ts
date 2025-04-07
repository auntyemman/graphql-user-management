import { JwtService } from '@nestjs/jwt';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';

import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    private reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );

    if (isPublic) {
      return true; // Skip JWT validation for public routes
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new BadRequestException('No Token provided');
    }
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload?.sub);
      request.user = user;
      return true;
    } catch (error) {
      if (error.message.includes('jwt expired')) {
        throw new UnauthorizedException('Access token expired!');
      }
      throw new UnauthorizedException('Invalid auth token!');
    }
  }
  private extractToken(request: Request): string | undefined {
    return request.headers.authorization?.split(' ')[1];
  }
}