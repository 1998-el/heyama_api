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

  // transforme un objet (doc mongoose) en objet "public" avec une URL signée à la place de l'URL brute
  private async toPublic(object: ObjectDocument): Promise<Record<string, unknown>> {
    const plain = object.toObject();
    return {
      ...plain,
      imageUrl: await this.signedUrl.sign(plain.imageUrl),
    };
  }

  async create(dto: CreateObjectDto, file?: Express.Multer.File) {
    if (!file) {
      // l'image est obligatoire d'après le cahier des charges, pas de fallback ici
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

  // un id invalide (ex: "undefined" envoyé par le front) ne doit pas planter en 500 CastError
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

    // deleteImage avale ses propres erreurs (cf upload.service), donc on continue
    // même si B2 répond mal, on veut pas d'objet fantôme qui traine en base
    await this.uploadService.deleteImage(found.imageUrl);
    await this.objectModel.findByIdAndDelete(id).exec();

    this.socketGateway.notifyObjectDeleted(id);

    return { id, deleted: true };
  }
}
