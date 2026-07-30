import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationEntity, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationEntity.name) private readonly notificationModel: Model<NotificationDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    actorId: string;
    actorName: string;
    actorAvatar?: string;
    targetId?: string;
    targetType?: string;
    content: string;
    link: string;
  }) {
    return this.notificationModel.create(data);
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.notificationModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.notificationModel.countDocuments({ userId }).exec(),
    ]);
    return { notifications, total, page, limit };
  }

  async markAsRead(id: string) {
    return this.notificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true }).exec();
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany({ userId, isRead: false }, { isRead: true }).exec();
  }

  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({ userId, isRead: false }).exec();
  }

  async notifyLike(authorId: string, actorId: string, postId: string) {
    if (authorId === actorId) return;

    const actor = await this.usersService.findById(actorId);
    return this.create({
      userId: authorId,
      type: NotificationType.LIKE,
      actorId,
      actorName: actor?.name || 'Utilisateur',
      actorAvatar: actor?.avatar,
      targetId: postId,
      targetType: 'POST',
      content: `${actor?.name || 'Utilisateur'} a liké votre article`,
      link: `/blog/${postId}`,
    });
  }

  async notifyComment(authorId: string, actorId: string, postId: string, actorName: string) {
    if (authorId === actorId) return;

    return this.create({
      userId: authorId,
      type: NotificationType.COMMENT,
      actorId,
      actorName,
      targetId: postId,
      targetType: 'POST',
      content: `${actorName} a commenté votre article`,
      link: `/blog/${postId}`,
    });
  }

  async notifyFollow(authorId: string, actorId: string, authorSlug?: string) {
    if (authorId === actorId) return;

    const actor = await this.usersService.findById(actorId);
    if (!actor) return;

    const slug = authorSlug || authorId;

    return this.create({
      userId: authorId,
      type: NotificationType.FOLLOW,
      actorId,
      actorName: actor.name || 'Utilisateur',
      actorAvatar: actor.avatar,
      link: `/authors/${slug}`,
      content: `${actor.name || 'Utilisateur'} vous suit maintenant`,
    });
  }
}
