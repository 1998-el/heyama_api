import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PostEntity, PostDocument, PostStatus } from '../posts/schemas/post.schema';
import { InteractionsService, UserProfile } from '../interactions/interactions.service';

export interface ScoredPost {
  post: PostDocument;
  score: number;
}

@Injectable()
export class PersonalizationService {
  constructor(
    @InjectModel(PostEntity.name) private readonly postModel: Model<PostDocument>,
    private readonly interactionsService: InteractionsService,
  ) {}

  /**
   * Score a single post against a user profile
   */
  scorePost(post: PostDocument, profile: UserProfile): number {
    const categoryKey = post.categoryId ? post.categoryId.toString() : '__uncategorized__';
    const authorKey = post.authorId ? post.authorId.toString() : '';

    const categoryAffinity = profile.categoryScore[categoryKey] ?? 0;
    const authorAffinity = authorKey ? (profile.authorScore[authorKey] ?? 0) : 0;

    // Recency: posts published in last 30 days get a boost
    const daysSincePublished = post.publishedAt
      ? (Date.now() - post.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const recencyBoost = Math.max(0, 30 - daysSincePublished) * 0.5;

    // Popularity: logarithmic boost based on likes and comments
    const popularityBoost = Math.log1p((post.likes ?? 0) + (post.commentsCount ?? 0) * 2);

    return categoryAffinity * 2 + authorAffinity * 3 + recencyBoost + popularityBoost;
  }

  /**
   * Get personalized feed for a user.
   * - Anonymous or cold-start users → sorted by popularity (views + likes)
   * - Users with history → scored & sorted with 70/30 discovery mix
   */
  async getPersonalizedFeed(userId: string | null): Promise<PostDocument[]> {
    // Fetch all published posts
    const allPosts = await this.postModel
      .find({ status: PostStatus.PUBLISHED })
      .sort({ publishedAt: -1 })
      .exec();

    if (!allPosts.length) return [];

    // Anonymous user → sort by popularity
    if (!userId) {
      return this.sortByPopularity(allPosts);
    }

    // Build user profile
    const profile = await this.interactionsService.getUserProfile(userId);

    // Cold start → no history, sort by popularity
    if (!profile.hasHistory) {
      return this.sortByPopularity(allPosts);
    }

    // Personalized scoring
    const scored: ScoredPost[] = allPosts.map((post) => ({
      post,
      score: this.scorePost(post, profile),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // 70/30 mix: top 70% by score, 30% from remaining for discovery
    const personalCount = Math.ceil(scored.length * 0.7);
    const discoveryCount = scored.length - personalCount;

    const personalPosts = scored.slice(0, personalCount).map((s) => s.post);
    const discoveryPool = scored.slice(personalCount);

    // Shuffle discovery pool for randomness
    const shuffled = this.shuffleArray(discoveryPool).slice(0, discoveryCount);
    const discoveryPosts = shuffled.map((s) => s.post);

    // Interleave: personal first, then discovery
    return [...personalPosts, ...discoveryPosts];
  }

  private sortByPopularity(posts: PostDocument[]): PostDocument[] {
    return [...posts].sort((a, b) => {
      const aScore = (a.views ?? 0) + (a.likes ?? 0) * 3 + (a.commentsCount ?? 0) * 2;
      const bScore = (b.views ?? 0) + (b.likes ?? 0) * 3 + (b.commentsCount ?? 0) * 2;
      return bScore - aScore;
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

