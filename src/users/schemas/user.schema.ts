import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<UserEntity>;

export enum UserRole {
  READER = 'READER',
  AUTHOR = 'AUTHOR',
  ADMIN = 'ADMIN',
}

@Schema({ timestamps: true })
export class UserEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  avatar: string;

  @Prop({ required: true, enum: ['google', 'facebook'] })
  provider: 'google' | 'facebook';

  @Prop({ required: true, unique: true })
  providerId: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.READER })
  role: UserRole;

  @Prop({ default: false })
  isProfileComplete: boolean;

  @Prop()
  bio?: string;

  @Prop()
  website?: string;

  @Prop()
  twitter?: string;

  @Prop()
  linkedin?: string;

  @Prop()
  location?: string;

  @Prop([String])
  expertise?: string[];

  @Prop({ type: Types.ObjectId, ref: 'AuthorEntity' })
  authorId?: Types.ObjectId;

  @Prop({ default: Date.now })
  lastActiveAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);
