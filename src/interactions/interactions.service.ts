import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InteractionEntity, InteractionDocument, InteractionType } from './schemas/interaction.schema';

const WEIGHT_MAP: Record<InteractionType, number> = {
  view: 1,
  like: 3,
  comment: 4,
  follow_author: 6,
};

export interface UserProfile {
  categoryScore: Record<string, number>;
  authorScore: Record<string, number>;
  hasHistory: boolean;
}

@Injectable()
export class InteractionsService {
  constructor(
    @InjectModel(InteractionEntity.name)
    private readonly interactionModel: Model<InteractionDocument>,
  ) {}

  async logInteraction(data: {
    userId: string;
    postId?: string;
    authorId?: string;
    category: string;
    type: InteractionType;
  }) {
    const weight = WEIGHT_MAP[data.type] ?? 1;

    return this.interactionModel.create({
      userId: new Types.ObjectId(data.userId),
      postId: data.postId ? new Types.ObjectId(data.postId) : undefined,
      authorId: data.authorId ? new Types.ObjectId(data.authorId) : undefined,
      category: data.category,
      type: data.type,
      weight,
    });
  }

  async getUserProfile(userId: string, days = 60): Promise<UserProfile> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const interactions = await this.interactionModel
      .find({
        userId: new Types.ObjectId(userId),
        createdAt: { $gte: since },
      })
      .lean()
      .exec();

    const categoryScore: Record<string, number> = {};
    const authorScore: Record<string, number> = {};

    for (const i of interactions) {
      const daysOld = (Date.now() - (i.createdAt?.getTime() ?? Date.now())) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.max(0.3, 1 - daysOld / 60); // decay over 60 days
      const effectiveWeight = i.weight * decayFactor;

      categoryScore[i.category] = (categoryScore[i.category] ?? 0) + effectiveWeight;
      if (i.authorId) {
        const authorKey = i.authorId.toString();
        authorScore[authorKey] = (authorScore[authorKey] ?? 0) + effectiveWeight;
      }
    }

    return {
      categoryScore,
      authorScore,
      hasHistory: interactions.length > 0,
    };
  }

  async hasHistory(userId: string): Promise<boolean> {
    const count = await this.interactionModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .limit(1)
      .exec();
    return count > 0;
  }
}

