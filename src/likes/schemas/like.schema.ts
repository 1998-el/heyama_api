import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LikeDocument = HydratedDocument<LikeEntity>;

@Schema({ timestamps: true })
export class LikeEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PostEntity' })
  postId: Types.ObjectId;

  createdAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(LikeEntity);

LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
