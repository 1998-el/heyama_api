import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { AuthorEntity, AuthorDocument } from './schemas/author.schema';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectModel(AuthorEntity.name) private readonly authorModel: Model<AuthorDocument>,
  ) {}

  async create(data: Partial<AuthorEntity>) {
    return this.authorModel.create(data);
  }

  async findAll(query: { sort?: string; search?: string; page?: number; limit?: number }) {
    const filter: any = {};
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    const sortMap: Record<string, any> = {
      popular: { 'stats.totalFollowers': -1 },
      recent: { createdAt: -1 },
      top: { 'stats.totalViews': -1 },
    };

    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const [authors, total] = await Promise.all([
      this.authorModel.find(filter).sort(sortMap[query.sort || 'recent'] || { createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.authorModel.countDocuments(filter).exec(),
    ]);

    return { authors, total, page, limit };
  }

  async findBySlug(slug: string) {
    return this.authorModel.findOne({ slug }).exec();
  }

  async findById(id: string) {
    this.assertValidId(id);
    return this.authorModel.findById(id).exec();
  }

  async findByUserId(userId: string) {
    this.assertValidId(userId);
    return this.authorModel.findOne({ userId }).exec();
  }

  async update(id: string, data: Partial<AuthorEntity>) {
    this.assertValidId(id);
    return this.authorModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async incrementStat(id: string, field: string, value: number = 1) {
    this.assertValidId(id);
    return this.authorModel.findByIdAndUpdate(id, { $inc: { [`stats.${field}`]: value } }, { new: true }).exec();
  }

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`id auteur invalide: ${id}`);
    }
  }
}
