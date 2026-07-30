import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostEntity } from '../posts/schemas/post.schema';

@Injectable()
export class AnalyticsService {
  constructor(@InjectModel(PostEntity.name) private readonly postModel: Model<PostEntity>) {}

  async getAuthorAnalytics(authorId: string) {
    const posts = await this.postModel.find({ authorId }).exec();
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + p.views, 0);
    const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.commentsCount, 0);

    const recentPosts = posts
      .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))
      .slice(0, 10)
      .map(p => ({
        title: p.title,
        views: p.views,
        likes: p.likes,
        comments: p.commentsCount,
        publishedAt: p.publishedAt,
      }));

    return {
      overview: { totalPosts, totalViews, totalLikes, totalComments, totalFollowers: 0 },
      recentPosts,
      engagementOverTime: [],
    };
  }

  async getPostAnalytics(slug: string) {
    const post = await this.postModel.findOne({ slug }).exec();
    if (!post) {
      throw new Error('Article introuvable');
    }
    return {
      title: post.title,
      views: post.views,
      likes: post.likes,
      comments: post.commentsCount,
      bookmarks: post.bookmarks,
    };
  }
}
