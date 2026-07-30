import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LikeEntity, LikeDocument } from './schemas/like.schema';

@Injectable()
export class LikesService {
  constructor(@InjectModel(LikeEntity.name) private readonly likeModel: Model<LikeDocument>) {}

  async create(data: { userId: string; postId: string }) {
    return this.likeModel.create(data);
  }

  async delete(userId: string, postId: string) {
    return this.likeModel.findOneAndDelete({ userId, postId }).exec();
  }

  async getMyLikes(userId: string) {
    const likes = await this.likeModel.find({ userId }).populate('postId').exec();
    return { likes };
  }
}
