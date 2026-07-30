import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { TagEntity, TagDocument } from './schemas/tag.schema';

@Injectable()
export class TagsService {
  constructor(@InjectModel(TagEntity.name) private readonly tagModel: Model<TagDocument>) {}

  async create(data: Partial<TagEntity>) {
    return this.tagModel.create(data);
  }

  async findAll() {
    return this.tagModel.find().sort({ name: 1 }).exec();
  }

  async findBySlug(slug: string) {
    return this.tagModel.findOne({ slug }).exec();
  }

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`id tag invalide: ${id}`);
    }
  }
}
