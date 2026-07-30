import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuthorDocument = HydratedDocument<AuthorEntity>;

export interface AuthorStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface AuthorBadge {
  name: string;
  icon?: string;
  awardedAt: Date;
}

@Schema({ timestamps: true })
export class AuthorEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  bio: string;

  @Prop({ required: true })
  avatar: string;

  @Prop()
  coverImage?: string;

  @Prop({ required: true, default: 'from-blue-500 to-purple-600' })
  gradient: string;

  @Prop({ type: Object })
  socialLinks: any;

  @Prop({ type: Object, default: () => ({
    totalPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
    totalFollowing: 0,
  })})
  stats: AuthorStats;

  @Prop([{ name: String, icon: String, awardedAt: Date }])
  badges: AuthorBadge[];

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  joinedAt?: Date;
  updatedAt?: Date;
}

export const AuthorSchema = SchemaFactory.createForClass(AuthorEntity);

AuthorSchema.index({ slug: 1 }, { unique: true });
AuthorSchema.index({ userId: 1 }, { unique: true });
AuthorSchema.index({ 'stats.totalFollowers': -1 });
