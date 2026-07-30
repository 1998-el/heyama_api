import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<CategoryEntity>;

@Schema({ timestamps: true })
export class CategoryEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop()
  color?: string;

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  postCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(CategoryEntity);

CategorySchema.index({ name: 1 }, { unique: true });
CategorySchema.index({ slug: 1 }, { unique: true });
