import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshTokenEntity>;

@Schema({ timestamps: true })
export class RefreshTokenEntity {
  @Prop({ required: true, type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ required: true })
  hashedToken: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshTokenEntity);
