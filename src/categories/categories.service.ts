import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { CategoryEntity, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(CategoryEntity.name) private readonly categoryModel: Model<CategoryDocument>) {}

  async create(data: Partial<CategoryEntity>) {
    return this.categoryModel.create(data);
  }

  async findAll() {
    return this.categoryModel.find().sort({ name: 1 }).exec();
  }

  async findBySlug(slug: string) {
    return this.categoryModel.findOne({ slug }).exec();
  }

  async findById(id: string) {
    this.assertValidId(id);
    return this.categoryModel.findById(id).exec();
  }

  async update(id: string, data: Partial<CategoryEntity>) {
    this.assertValidId(id);
    return this.categoryModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string) {
    this.assertValidId(id);
    return this.categoryModel.findByIdAndDelete(id).exec();
  }

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`id catégorie invalide: ${id}`);
    }
  }
}
