import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ObjectDocument = HydratedDocument<ObjectEntity>;

// on l'appelle ObjectEntity pour pas rentrer en conflit avec le Object global de JS
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class ObjectEntity {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  imageUrl: string;

  createdAt?: Date;
}

export const ObjectSchema = SchemaFactory.createForClass(ObjectEntity);
