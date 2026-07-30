import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InteractionDocument = HydratedDocument<InteractionEntity>;

export type InteractionType = 'view' | 'like' | 'comment' | 'follow_author';

@Schema({ timestamps: true })
export class InteractionEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'PostEntity' })
  postId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AuthorEntity' })
  authorId?: Types.ObjectId;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, enum: ['view', 'like', 'comment', 'follow_author'] })
  type: InteractionType;

  @Prop({ required: true, default: 1 })
  weight: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InteractionSchema = SchemaFactory.createForClass(InteractionEntity);

InteractionSchema.index({ userId: 1, createdAt: -1 });
InteractionSchema.index({ userId: 1, type: 1 });
InteractionSchema.index({ postId: 1 });