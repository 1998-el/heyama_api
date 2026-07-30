import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { UserEntity, UserDocument } from './schemas/user.schema';
import { AuthorEntity } from '../authors/schemas/author.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(UserEntity.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(data: Partial<UserEntity>) {
    return this.userModel.create(data);
  }

  async findById(id: string) {
    this.assertValidId(id);
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, data: Partial<UserEntity>) {
    this.assertValidId(id);
    return this.userModel.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).exec();
  }

  async findWithAuthor(id: string) {
    this.assertValidId(id);
    return this.userModel.findById(id).populate('authorId').exec();
  }

  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`id utilisateur invalide: ${id}`);
    }
  }
}
