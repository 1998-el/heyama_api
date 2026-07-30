import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { PostEntity, PostDocument, PostStatus } from './schemas/post.schema';
import { LikeEntity, LikeDocument } from '../likes/schemas/like.schema';
import { BookmarkEntity, BookmarkDocument } from '../bookmarks/schemas/bookmark.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthorsService } from '../authors/authors.service';
import { CategoriesService } from '../categories/categories.service';
import { InteractionsService } from '../interactions/interactions.service';
import { PersonalizationService } from '../personalization/personalization.service';
import { FollowsService } from '../follows/follows.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectModel(PostEntity.name) private readonly postModel: Model<PostDocument>,
    @InjectModel(LikeEntity.name) private readonly likeModel: Model<LikeDocument>,
    @InjectModel(BookmarkEntity.name) private readonly bookmarkModel: Model<BookmarkDocument>,
    private readonly notificationService: NotificationsService,
    private readonly authorsService: AuthorsService,
    private readonly categoriesService: CategoriesService,
    private readonly interactionsService: InteractionsService,
    private readonly personalizationService: PersonalizationService,
    private readonly followsService: FollowsService,
  ) {}

  async create(data: { authorId?: string; categoryId?: string } & Record<string, any>) {
    if (data.categoryId) {
      await this.categoriesService.findBySlug(data.categoryId);
    }

    // determine status (default to DRAFT)
    const status = (data.status as PostStatus) || PostStatus.DRAFT;

    // generate a readable, unique slug from title
    const title = data.title || 'post';
    let slug = this.generateSlug(title);
    // attempt create, retry on duplicate slug up to a few times
    let post;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // ensure required fields for schema exist when creating a draft
        // If creating a non-draft (e.g. PUBLISHED), require content & description
        if (status !== PostStatus.DRAFT) {
          if (!data.content || !String(data.content).trim()) {
            throw new BadRequestException('Contenu requis pour publier un article');
          }
          if (!data.description || !String(data.description).trim()) {
            throw new BadRequestException('Description requise pour publier un article');
          }
        }

        const payload = {
          ...data,
          authorId: data.authorId,
          slug,
          status,
          likes: 0,
          commentsCount: 0,
          bookmarks: 0,
          views: 0,
          comments: [],
          // allow creating empty drafts: populate required fields with empty strings
          description:
            data.description === undefined || data.description === null
              ? status === PostStatus.DRAFT
                ? ''
                : undefined
              : data.description,
          content:
            data.content === undefined || data.content === null
              ? status === PostStatus.DRAFT
                ? ''
                : undefined
              : data.content,
        } as any;

        post = await this.postModel.create(payload);
        break;
      } catch (err: any) {
        // duplicate slug -> regenerate and retry
        if (err?.code === 11000 && (err?.message || '').includes('slug')) {
          slug = this.generateSlug(title);
          continue;
        }
        if (err?.name === 'ValidationError') {
          const messages = Object.values(err.errors || {}).map((error: any) => error.message).join('; ');
          throw new BadRequestException(messages || 'Erreur de validation du post');
        }
        throw err;
      }
    }

    if (data.authorId) {
      await this.authorsService.incrementStat(data.authorId, 'totalPosts', 1);
    }

    return post;
  }

  private generateSlug(title: string) {
    const base = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }

  async findAll(query: { type?: string; category?: string; tag?: string; author?: string; page?: number; limit?: number; userId?: string }) {
    const filter: any = { status: PostStatus.PUBLISHED };

    if (query.category) {
      const category = await this.categoriesService.findBySlug(query.category);
      if (category) {
        filter.categoryId = category._id;
      }
    }

    if (query.author) {
      const author = await this.authorsService.findBySlug(query.author);
      if (author) {
        filter.authorId = author._id;
      }
    }

    if (query.tag) {
      filter.tags = query.tag;
    }

    const page = query.page || 1;
    const limit = query.limit || 12;

    // If a specific type filter is requested (e.g. category, author, tag), use normal DB query
    const hasExplicitFilter = !!(query.category || query.author || query.tag);

    if (hasExplicitFilter) {
      const sortMap: Record<string, any> = {
        popular: { views: -1 },
        recent: { publishedAt: -1 },
        home: { publishedAt: -1 },
      };
      const sortKey = query.type && sortMap[query.type] ? query.type : 'home';
      const skip = (page - 1) * limit;
      const [posts, total] = await Promise.all([
        this.postModel.find(filter).sort(sortMap[sortKey] || { publishedAt: -1 }).skip(skip).limit(limit).exec(),
        this.postModel.countDocuments(filter).exec(),
      ]);

      // Enrichir avec le statut de suivi
      if (query.userId) {
        await this.enrichWithFollowStatus(posts, query.userId);
      }

      return { posts, total, page, limit };
    }

    // No explicit filter → use personalization if userId is provided
    if (query.userId) {
      const allMatchingPosts = await this.postModel.find(filter).sort({ publishedAt: -1 }).exec();
      const personalized = await this.personalizationService.getPersonalizedFeed(query.userId);

      // Filter personalized posts to only those matching our base filter (status=PUBLISHED)
      const matchingIds = new Set(allMatchingPosts.map(p => p._id.toString()));
      const filtered = personalized.filter(p => matchingIds.has(p._id.toString()));

      const total = filtered.length;
      const skip = (page - 1) * limit;
      const posts = filtered.slice(skip, skip + limit);

      // Enrichir avec le statut de suivi
      if (query.userId) {
        await this.enrichWithFollowStatus(posts as any, query.userId);
      }

      return { posts, total, page, limit };
    }

    // Default fallback: sort by popularity
    const sortMap: Record<string, any> = {
      popular: { views: -1 },
      recent: { publishedAt: -1 },
      home: { publishedAt: -1 },
    };
    const sortKey = query.type && sortMap[query.type] ? query.type : 'home';
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.postModel.find(filter).sort(sortMap[sortKey] || { publishedAt: -1 }).skip(skip).limit(limit).exec(),
      this.postModel.countDocuments(filter).exec(),
    ]);

    // Enrichir avec le statut de suivi
    if (query.userId) {
      await this.enrichWithFollowStatus(posts, query.userId);
    }

    return { posts, total, page, limit };
  }

  private async enrichWithFollowStatus(posts: PostDocument[], userId: string) {
    const authorIds = posts.map((p) => (p.authorId as any)._id?.toString() ?? p.authorId.toString());
    const statusMap = await this.followsService.getFollowingStatusBatch(userId, authorIds);
    for (const post of posts) {
      const pid = (post.authorId as any)._id?.toString() ?? post.authorId.toString();
      (post as any).isFollowing = statusMap[pid] ?? false;
    }
  }

  async findOneId(identifier: string): Promise<PostDocument> {
    const filter = isValidObjectId(identifier)
      ? { $or: [{ _id: identifier }, { slug: identifier }] }
      : { slug: identifier };

    const post = await this.postModel.findOne(filter).exec();
    if (!post) {
      throw new NotFoundException(`Article introuvable: ${identifier}`);
    }
    return post;
  }

async findOne(slug: string, userId?: string) {
     const post = await this.postModel.findOne({ slug }).populate('authorId').exec();

     if (!post) {
       throw new NotFoundException(`Article introuvable: ${slug}`);
     }

     if (post.status !== PostStatus.PUBLISHED) {
       throw new ForbiddenException('Article non publié');
     }

     await this.postModel.findByIdAndUpdate(post._id, { $inc: { views: 1 } }).exec();

     // Log view interaction for personalization (if user is logged in)
     if (userId) {
       const category = await this.resolveCategorySlug(post.categoryId?.toString());
       await this.interactionsService.logInteraction({
         userId,
         postId: post._id.toString(),
         authorId: post.authorId.toString(),
         category,
         type: 'view',
       });
     }

     let hasLiked = false;
     let hasBookmarked = false;
     let isCurrentUserAuthor = false;
     let isFollowing = false;

     const authorId = (post.authorId as any)._id?.toString() ?? (post.authorId as any).toString();
     const authorSlug = (post.authorId as any).slug;

     if (userId) {
       const like = await this.likeModel.findOne({ userId, postId: post._id }).exec();
       const bookmark = await this.bookmarkModel.findOne({ userId, postId: post._id }).exec();
       hasLiked = !!like;
       hasBookmarked = !!bookmark;

       // Vérifie si l'utilisateur connecté est l'auteur de l'article
       const authorUserId = (post.authorId as any).userId?.toString();
       isCurrentUserAuthor = authorUserId === userId;

       // Vérifie si l'utilisateur suit l'auteur de l'article
       if (!isCurrentUserAuthor) {
         isFollowing = await this.followsService.isFollowing(userId, authorId);
       }
     }

     return {
       post: {
         ...post.toObject(),
         authorId,
         authorSlug,
       },
       userInteraction: {
         hasLiked,
         hasBookmarked,
         isCurrentUserAuthor,
         isFollowing,
       },
     };
   }

  async update(id: string, data: Partial<PostEntity>, requestingAuthorId?: string) {
    this.assertValidId(id);
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Article introuvable: ${id}`);
    }
    if (requestingAuthorId && post.authorId.toString() !== requestingAuthorId) {
      throw new ForbiddenException("Vous n'êtes pas l'auteur de cet article");
    }
    return this.postModel.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).exec();
  }

  async publish(identifier: string, requestingAuthorId?: string) {
    const post = await this.findOneId(identifier);
    if (requestingAuthorId && post.authorId.toString() !== requestingAuthorId) {
      throw new ForbiddenException("Vous n'êtes pas l'auteur de cet article");
    }
    return this.postModel.findByIdAndUpdate(
      post._id,
      { status: PostStatus.PUBLISHED, publishedAt: new Date(), $unset: { scheduledFor: 1 } },
      { new: true },
    ).exec();
  }

  async remove(id: string, requestingAuthorId?: string) {
    this.assertValidId(id);
    const post = await this.postModel.findById(id).exec();
    if (!post) {
      throw new NotFoundException(`Article introuvable: ${id}`);
    }
    if (requestingAuthorId && post.authorId.toString() !== requestingAuthorId) {
      throw new ForbiddenException("Vous n'êtes pas l'auteur de cet article");
    }
    await this.postModel.findByIdAndDelete(id).exec();
    await this.authorsService.incrementStat(post.authorId.toString(), 'totalPosts', -1);
    return { id, deleted: true };
  }

  async findByAuthorStatus(authorId?: string) {
    if (!authorId) return { posts: [] };
    const posts = await this.postModel
      .find({ authorId, status: { $ne: PostStatus.PUBLISHED } })
      .sort({ updatedAt: -1 })
      .exec();
    return { posts };
  }

  async toggleLike(postId: string, userId: string) {
    this.assertValidId(postId);
    this.assertValidId(userId);

    const existing = await this.likeModel.findOne({ userId, postId }).exec();

    if (existing) {
      await this.likeModel.findByIdAndDelete(existing._id).exec();
      await this.postModel.findByIdAndUpdate(postId, { $inc: { likes: -1 } }).exec();
      return { liked: false };
    }

    await this.likeModel.create({ userId, postId });
    await this.postModel.findByIdAndUpdate(postId, { $inc: { likes: 1 } }).exec();

    // Log interaction for personalization
    const post = await this.postModel.findById(postId).exec();
    if (post) {
      const category = await this.resolveCategorySlug(post.categoryId?.toString());
      await this.interactionsService.logInteraction({
        userId,
        postId: post._id.toString(),
        authorId: post.authorId.toString(),
        category,
        type: 'like',
      });

      await this.notificationService.notifyLike(post.authorId.toString(), userId, post._id.toString());
    }

    return { liked: true };
  }

  private async resolveCategorySlug(categoryId?: string): Promise<string> {
    if (!categoryId) return '__uncategorized__';
    try {
      const cat = await this.categoriesService.findBySlug(categoryId);
      if (cat) return cat.slug;
    } catch {}
    // Try finding by id
    try {
      const cat = await this.categoriesService.findById(categoryId);
      return cat?.slug ?? '__uncategorized__';
    } catch {}
    return '__uncategorized__';
  }

  async getLikes(postId: string, userId?: string) {
    this.assertValidId(postId);
    const likes = await this.likeModel.find({ postId }).populate('userId', 'name avatar').limit(10).exec();
    const hasLiked = userId ? !!(await this.likeModel.findOne({ userId, postId }).exec()) : false;
    const total = await this.likeModel.countDocuments({ postId }).exec();

    return {
      totalLikes: total,
      hasLiked,
      recentLikers: likes.slice(0, 5).map(l => ({
        userId: (l.userId as any)._id,
        name: (l.userId as any).name,
        avatar: (l.userId as any).avatar,
      })),
    };
  }

  async createComment(postSlug: string, userId: string, userName: string, content: string, userAvatar?: string, parentId?: string) {
    const post = await this.findOneId(postSlug);

    const comment = {
      userId: userId as any,
      userName,
      userAvatar,
      content,
      parentId: parentId as any,
      likes: 0,
      status: 'APPROVED' as const,
      isEdited: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.postModel.findByIdAndUpdate(post._id, {
      $push: { comments: { ...comment, _id: new Types.ObjectId() } },
      $inc: { commentsCount: 1 },
    }).exec();

    // Log comment interaction for personalization
    const category = await this.resolveCategorySlug(post.categoryId?.toString());
    await this.interactionsService.logInteraction({
      userId,
      postId: post._id.toString(),
      authorId: post.authorId.toString(),
      category,
      type: 'comment',
    });

    await this.notificationService.notifyComment(post.authorId.toString(), userId, post._id.toString(), userName);

    const updated = await this.postModel.findById(post._id).exec();
    if (!updated) {
      throw new NotFoundException('Article introuvable après commentaire');
    }
    const added = updated.comments[updated.comments.length - 1];

    return added;
  }

  async findComments(postSlug: string, parentId?: string) {
    const post = await this.findOneId(postSlug);

    let comments = post.comments.filter(c => c.status === 'APPROVED');

    if (parentId) {
      comments = comments.filter(c => (c.parentId as any)?.toString() === parentId);
    } else {
      comments = comments.filter(c => !c.parentId);
    }

    const page = 1;
    const limit = 20;
    const start = (page - 1) * limit;

    return {
      comments: comments.slice(start, start + limit).map(c => ({
        ...c,
        id: c._id?.toString(),
      })),
      total: comments.length,
    };
  }

  async updateComment(postId: string, commentId: string, content: string) {
    this.assertValidId(postId);
    this.assertValidId(commentId);

    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Article introuvable');
    }

    const comment = (post.comments as any).id(commentId);
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    comment.content = content;
    comment.isEdited = true;
    comment.updatedAt = new Date();

    await post.save();
    return { comment };
  }

  async removeComment(postId: string, commentId: string) {
    this.assertValidId(postId);
    this.assertValidId(commentId);

    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Article introuvable');
    }

    await this.postModel.findByIdAndUpdate(post._id, {
      $pull: { comments: { _id: commentId } },
      $inc: { commentsCount: -1 },
    }).exec();

    return { id: commentId, deleted: true };
  }

  async toggleCommentLike(postId: string, commentId: string): Promise<{ likes: number }> {
    this.assertValidId(postId);
    this.assertValidId(commentId);

    const post = await this.postModel.findById(postId).exec();
    if (!post) {
      throw new NotFoundException('Article introuvable');
    }

    const comment = (post.comments as any).id(commentId);
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable');
    }

    comment.likes += 1;
    await post.save();

    return { likes: comment.likes };
  }

  async toggleBookmark(postId: string, userId: string) {
    this.assertValidId(postId);
    this.assertValidId(userId);

    const existing = await this.bookmarkModel.findOne({ userId, postId }).exec();

    if (existing) {
      await this.bookmarkModel.findByIdAndDelete(existing._id).exec();
      await this.postModel.findByIdAndUpdate(postId, { $inc: { bookmarks: -1 } }).exec();
      return { bookmarked: false };
    }

    await this.bookmarkModel.create({ userId, postId });
    await this.postModel.findByIdAndUpdate(postId, { $inc: { bookmarks: 1 } }).exec();

    return { bookmarked: true };
  }

  async getUserBookmarks(userId: string) {
    this.assertValidId(userId);
    const bookmarks = await this.bookmarkModel.find({ userId }).populate('postId').exec();
    return { bookmarks };
  }

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

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`id invalide: ${id}`);
    }
  }
}