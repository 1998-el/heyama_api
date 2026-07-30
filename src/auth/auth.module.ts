import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserEntity, UserSchema } from '../users/schemas/user.schema';
import { AuthorEntity, AuthorSchema } from '../authors/schemas/author.schema';
import { RefreshTokenEntity, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { UsersModule } from '../users/users.module';
import { AuthorsModule } from '../authors/authors.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'default-secret-change-me',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: AuthorEntity.name, schema: AuthorSchema },
      { name: RefreshTokenEntity.name, schema: RefreshTokenSchema },
    ]),
    forwardRef(() => UsersModule),
    AuthorsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
