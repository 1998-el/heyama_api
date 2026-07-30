import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FollowDocument = HydratedDocument<FollowEntity>;

@Schema({ timestamps: true })
export class FollowEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  followerId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'AuthorEntity' })
  followingId: Types.ObjectId;

  createdAt?: Date;
}

export const FollowSchema = SchemaFactory.createForClass(FollowEntity);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
