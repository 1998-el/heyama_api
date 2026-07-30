import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TagDocument = HydratedDocument<TagEntity>;

@Schema({ timestamps: true })
export class TagEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: 0 })
  postCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TagSchema = SchemaFactory.createForClass(TagEntity);

TagSchema.index({ name: 1 }, { unique: true });
TagSchema.index({ slug: 1 }, { unique: true });
