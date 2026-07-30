import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostDocument = HydratedDocument<PostEntity>;

export interface PostComment {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: Types.ObjectId;
  likes: number;
  status: 'APPROVED' | 'PENDING' | 'SPAM';
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  SCHEDULED = 'SCHEDULED',
  ARCHIVED = 'ARCHIVED',
}

export enum PostVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

@Schema({ timestamps: true })
export class PostEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AuthorEntity' })
  authorId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop()
  subtitle?: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ trim: true, default: '' })
  content?: string;

  @Prop()
  coverImage?: string;

  @Prop({ type: Types.ObjectId, ref: 'CategoryEntity' })
  categoryId?: Types.ObjectId;

  @Prop([String])
  tags: string[];

  @Prop({ type: String, enum: PostStatus, default: PostStatus.DRAFT })
  status: PostStatus;

  @Prop({ type: String, enum: PostVisibility, default: PostVisibility.PUBLIC })
  visibility: PostVisibility;

  @Prop()
  publishedAt?: Date;

  @Prop()
  scheduledFor?: Date;

  @Prop()
  readTime?: string;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  likes: number;

  @Prop({ default: 0 })
  commentsCount: number;

  @Prop({ default: 0 })
  bookmarks: number;

  @Prop([{
    _id: { type: Types.ObjectId, auto: true },
    userId: { type: Types.ObjectId, ref: 'UserEntity', required: true },
    userName: { type: String, required: true },
    userAvatar: String,
    content: { type: String, required: true },
    parentId: { type: Types.ObjectId },
    likes: { type: Number, default: 0 },
    status: { type: String, enum: ['APPROVED', 'PENDING', 'SPAM'], default: 'PENDING' },
    isEdited: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }])
  comments: PostComment[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PostSchema = SchemaFactory.createForClass(PostEntity);

PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ authorId: 1, status: 1 });
PostSchema.index({ 'comments.createdAt': -1 });
