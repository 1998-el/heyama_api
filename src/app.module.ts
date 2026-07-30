import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuthorsModule } from './authors/authors.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { PostsModule } from './posts/posts.module';
import { LikesModule } from './likes/likes.module';
import { FollowsModule } from './follows/follows.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { FirebaseModule } from './firebase/firebase.module';
import { InteractionsModule } from './interactions/interactions.module';
import { PersonalizationModule } from './personalization/personalization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI ?? 'mongodb://localhost:27017/heyama', {
      serverSelectionTimeoutMS: 60000, // Timeout for server selection (default 30000)
      connectTimeoutMS: 60000,          // Timeout for initial connection (default 30000)
      socketTimeoutMS: 90000,           // Timeout for socket inactivity (default 30000)
    }),
    UsersModule,
    AuthModule,
    AuthorsModule,
    CategoriesModule,
    TagsModule,
    PostsModule,
    LikesModule,
    FollowsModule,
    BookmarksModule,
    NotificationsModule,
    AnalyticsModule,
    FirebaseModule,
    InteractionsModule,
    PersonalizationModule,
  ],
})
export class AppModule {}
