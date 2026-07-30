import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';
import { LikeEntity, LikeSchema } from './schemas/like.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LikeEntity.name, schema: LikeSchema }]),
    AuthModule,
    UsersModule,
  ],
  controllers: [LikesController],
  providers: [LikesService],
  exports: [LikesService],
})
export class LikesModule {}
