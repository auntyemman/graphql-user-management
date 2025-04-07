import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class EnableBiometricLoginInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  biometricKey: string;
}

