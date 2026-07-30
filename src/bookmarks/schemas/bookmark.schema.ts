import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookmarkDocument = HydratedDocument<BookmarkEntity>;

@Schema({ timestamps: true })
export class BookmarkEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'PostEntity' })
  postId: Types.ObjectId;

  @Prop()
  collection?: string;

  @Prop()
  notes?: string;

  createdAt?: Date;
}

export const BookmarkSchema = SchemaFactory.createForClass(BookmarkEntity);

BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
