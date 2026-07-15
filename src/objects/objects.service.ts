import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isValidObjectId } from 'mongoose';
import { ObjectEntity, ObjectDocument } from './schemas/object.schema';
import { CreateObjectDto } from './dto/create-object.dto';
import { UploadService } from '../upload/upload.service';
import { SocketGateway } from '../socket/socket.gateway';
import { SignedUrlService } from '../signed-url/signed-url.service';

@Injectable()
export class ObjectsService {
  constructor(
    @InjectModel(ObjectEntity.name) private readonly objectModel: Model<ObjectDocument>,
    private readonly uploadService: UploadService,
    private readonly socketGateway: SocketGateway,
    private readonly signedUrl: SignedUrlService,
  ) {}

  // turn a mongoose doc into a "public" object, swapping the raw url for a signed one
  private async toPublic(object: ObjectDocument): Promise<Record<string, unknown>> {
    const plain = object.toObject();
    return {
      ...plain,
      imageUrl: await this.signedUrl.sign(plain.imageUrl),
    };
  }

  async create(dto: CreateObjectDto, file?: Express.Multer.File) {
    if (!file) {
      // image is required per spec, no fallback here
      throw new BadRequestException("l'image est obligatoire");
    }

    const imageUrl = await this.uploadService.uploadImage(file);

    const created = await this.objectModel.create({
      title: dto.title,
      description: dto.description ?? '',
      imageUrl,
    });

    const signed = await this.toPublic(created);
    this.socketGateway.notifyObjectCreated(signed);

    return signed;
  }

  async findAll() {
    const objects = await this.objectModel.find().sort({ createdAt: -1 }).exec();
    return Promise.all(objects.map((object) => this.toPublic(object)));
  }

  // an invalid id (e.g. "undefined" sent by the frontend) must not crash with a 500 CastError
  private assertValidId(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`id invalide: ${id}`);
    }
  }

  async findOne(id: string) {
    const found = await this.objectModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`objet ${id} introuvable`);
    }
    return this.toPublic(found);
  }

  async remove(id: string) {
    this.assertValidId(id);
    const found = await this.objectModel.findById(id).exec();
    if (!found) {
      throw new NotFoundException(`objet ${id} introuvable`);
    }

    // deleteImage swallows its own errors (see upload.service), so we continue
    // even if B2 fails to respond, we don't want a ghost object lingering in the database
    await this.uploadService.deleteImage(found.imageUrl);
    await this.objectModel.findByIdAndDelete(id).exec();

    this.socketGateway.notifyObjectDeleted(id);

    return { id, deleted: true };
  }
}
