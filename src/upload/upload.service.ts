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
    // keep the original extension; we don't care about the rest of the filename
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
      this.logger.error(`B2 upload failed for ${key}`, err as Error);
      throw new InternalServerErrorException("image upload failed");
    }

    return `${this.publicUrl}/${key}`;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    // recover the key from the public url, everything after /objects/
    const marker = 'objects/';
    const idx = imageUrl.indexOf(marker);
    if (idx === -1) {
      this.logger.warn(`could not recover the B2 key from ${imageUrl}, skipping`);
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
      // we log but don't break the Mongo deletion for all that; an orphan image
      // is less harmful than a ghost object left in the database
      this.logger.error(`B2 deletion failed for ${key}`, err as Error);
    }
  }
}
