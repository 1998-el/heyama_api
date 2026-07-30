import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BookmarkEntity, BookmarkDocument } from './schemas/bookmark.schema';

@Injectable()
export class BookmarksService {
  constructor(@InjectModel(BookmarkEntity.name) private readonly bookmarkModel: Model<BookmarkDocument>) {}

  async create(data: { userId: string; postId: string; collection?: string; notes?: string }) {
    return this.bookmarkModel.create(data);
  }

  async delete(userId: string, postId: string) {
    return this.bookmarkModel.findOneAndDelete({ userId, postId }).exec();
  }

  async findByUser(userId: string) {
    return this.bookmarkModel.find({ userId }).populate('postId').exec();
  }
}
