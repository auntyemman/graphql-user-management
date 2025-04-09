import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../common/decorators/current-user';
import { Public } from '../common/decorators/public';
import { JwtAuthGuard } from '../common/guards/jwt.guard';
import { AuthResponse } from './dto/auth-response';
import {
  BiometricLoginInput,
  LoginInput,
  RegisterInput,
} from './dto/create-user.input';
import { EnableBiometricLoginInput } from './dto/update-user.input';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Mutation(() => User)
  async register(@Args('input') input: RegisterInput) {
    return await this.usersService.register(input);
  }

  @Public()
  @Mutation(() => AuthResponse)
  async login(@Args('input') input: LoginInput) {
    return await this.usersService.login(input);
  }

  @Public()
  @Mutation(() => AuthResponse)
  async biometricLogin(@Args('input') input: BiometricLoginInput) {
    return await this.usersService.biometricLogin(input.biometricKey);
  }

  @UseGuards(JwtAuthGuard)
  @Query(() => User)
  async me(@CurrentUser() user: User) {
    return user; // returns the user in session
  }

  @UseGuards(JwtAuthGuard)
  @Mutation(() => User)
  async enableBiometric(
    @Args('input') input: EnableBiometricLoginInput,
    @CurrentUser() user: User,
  ) {
    return await this.usersService.enableBiometric(user.id, input);
  }
}
