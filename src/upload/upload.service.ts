import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import 'multer';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.bucket = process.env.B2_BUCKET_NAME ?? '';
    this.publicUrl = (process.env.B2_PUBLIC_URL ?? '').replace(/\/$/, '');

    this.client = new S3Client({
      region: process.env.B2_REGION ?? 'auto',
      endpoint: process.env.B2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.B2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.B2_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    // on garde l'extension d'origine, le reste du nom on s'en fiche
    const ext = file.originalname.split('.').pop();
    const key = `objects/${Date.now()}-${uuid()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      this.logger.error(`upload B2 raté pour ${key}`, err as Error);
      throw new InternalServerErrorException("l'upload de l'image a échoué");
    }

    return `${this.publicUrl}/${key}`;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // on retrouve la clé à partir de l'url publique, tout ce qui vient après /objects/
    const marker = 'objects/';
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) {
      this.logger.warn(`impossible de retrouver la clé B2 depuis ${imageUrl}, on skip`);
      return;
    }
    const key = imageUrl.substring(idx);

    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (err) {
      // on log mais on casse pas la suppression Mongo pour autant, l'image orpheline
      // c'est moins grave qu'un objet fantôme en base
      this.logger.error(`suppression B2 ratée pour ${key}`, err as Error);
    }
  }
}
