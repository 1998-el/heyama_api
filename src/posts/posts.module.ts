import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostEntity, PostSchema } from './schemas/post.schema';
import { LikeEntity, LikeSchema } from '../likes/schemas/like.schema';
import { BookmarkEntity, BookmarkSchema } from '../bookmarks/schemas/bookmark.schema';
import { AuthorsModule } from '../authors/authors.module';
import { CategoriesModule } from '../categories/categories.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { UploadModule } from '../upload/upload.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { PersonalizationModule } from '../personalization/personalization.module';
import { FollowsModule } from '../follows/follows.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PostEntity.name, schema: PostSchema },
      { name: LikeEntity.name, schema: LikeSchema },
      { name: BookmarkEntity.name, schema: BookmarkSchema },
    ]),
    AuthorsModule,
    CategoriesModule,
    NotificationsModule,
    UploadModule,
    AuthModule,
    UsersModule,
    InteractionsModule,
    PersonalizationModule,
    FollowsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
