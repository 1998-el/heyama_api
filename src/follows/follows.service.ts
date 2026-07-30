import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { FollowEntity, FollowDocument } from './schemas/follow.schema';
import { AuthorsService } from '../authors/authors.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InteractionsService } from '../interactions/interactions.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Injectable()
export class FollowsService {
  constructor(
    @InjectModel(FollowEntity.name) private readonly followModel: Model<FollowDocument>,
    private readonly authorsService: AuthorsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly interactionsService: InteractionsService,
  ) {}

  async create(followerId: string, followingId: string) {
    this.assertValidId(followerId);
    this.assertValidId(followingId);

    // Vérifie que l'utilisateur ne tente pas de suivre son propre profil auteur
    const user = await this.usersService.findById(followerId);
    if (user?.authorId?.toString() === followingId) {
      throw new BadRequestException('Vous ne pouvez pas vous suivre vous-même');
    }

    const author = await this.authorsService.findById(followingId);
    if (!author) {
      throw new BadRequestException('Auteur introuvable');
    }

    let follow;
    let isNew = false;
    try {
      follow = await this.followModel.create({ followerId, followingId });
      isNew = true;
    } catch (error: any) {
      if (error?.code === 11000) {
        return this.followModel.findOne({ followerId, followingId }).exec();
      }
      throw error;
    }

    if (isNew) {
      await this.authorsService.incrementStat(followingId, 'totalFollowers', 1);

      await this.interactionsService.logInteraction({
        userId: followerId,
        authorId: followingId,
        category: '__follow__',
        type: 'follow_author',
      });

      const actor = await this.usersService.findById(followerId);
      if (actor) {
        await this.notificationsService.notifyFollow(
          author.userId.toString(),
          followerId,
          author.slug,
        );
      }
    }

    return follow;
  }

  async delete(followerId: string, followingId: string) {
    this.assertValidId(followerId);
    this.assertValidId(followingId);

    const result = await this.followModel.findOneAndDelete({ followerId, followingId }).exec();

    if (result) {
      await this.authorsService.incrementStat(followingId, 'totalFollowers', -1);
    }

    return result;
  }

  async isFollowing(followerId: string, followingId: string) {
    if (!isValidObjectId(followerId) || !isValidObjectId(followingId)) return false;
    return !!(await this.followModel.findOne({ followerId, followingId }).exec());
  }

  async getFollowingStatusBatch(followerId: string, authorIds: string[]) {
    if (!isValidObjectId(followerId)) {
      return Object.fromEntries(authorIds.map((id) => [id, false]));
    }

    const validIds = authorIds.filter((id) => isValidObjectId(id));
    const rows = await this.followModel
      .find({ followerId, followingId: { $in: validIds } })
      .select('followingId')
      .lean()
      .exec();

    const followedSet = new Set(rows.map((r) => r.followingId.toString()));
    return Object.fromEntries(authorIds.map((id) => [id, followedSet.has(id)]));
  }

  async getFollowers(authorId: string) {
    this.assertValidId(authorId);
    return this.followModel.find({ followingId: authorId }).populate('followerId', 'name avatar').exec();
  }

  async getFollowing(userId: string) {
    this.assertValidId(userId);
    return this.followModel.find({ followerId: userId }).populate('followingId').exec();
  }

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new Error(`id invalide: ${id}`);
    }
  }
}