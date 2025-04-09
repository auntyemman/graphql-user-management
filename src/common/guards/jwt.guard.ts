import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
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

    // using graphql context
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const token = this.extractToken(req);

    if (!token) {
      throw new BadRequestException('No Token provided');
    }
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload?.sub);
      req.user = user;
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
