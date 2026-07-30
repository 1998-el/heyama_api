import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<NotificationEntity>;

export enum NotificationType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  FOLLOW = 'FOLLOW',
  REPLY = 'REPLY',
  MENTION = 'MENTION',
}

@Schema({ timestamps: true })
export class NotificationEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true, type: Types.ObjectId, ref: 'UserEntity' })
  actorId: Types.ObjectId;

  @Prop({ required: true })
  actorName: string;

  @Prop()
  actorAvatar?: string;

  @Prop({ type: Types.ObjectId })
  targetId?: Types.ObjectId;

  @Prop({ type: String, enum: ['POST', 'COMMENT'] })
  targetType?: 'POST' | 'COMMENT';

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ required: true })
  link: string;

  createdAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationEntity);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
