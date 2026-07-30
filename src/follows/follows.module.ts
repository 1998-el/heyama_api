import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { FollowEntity, FollowSchema } from './schemas/follow.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { AuthorsModule } from '../authors/authors.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FollowEntity.name, schema: FollowSchema }]),
    AuthModule,
    UsersModule,
    InteractionsModule,
    AuthorsModule,
    NotificationsModule,
  ],
  controllers: [FollowsController],
  providers: [FollowsService],
  exports: [FollowsService],
})
export class FollowsModule {}
