import { Injectable, Logger } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class SignedUrlService {
  private readonly logger = new Logger(SignedUrlService.name);
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

  // the url stored in the database is the public url (https://.../file/<bucket>/<key>) ;
  // we extract the B2 object key (objects/xxx.png) from it to sign
  private extractKey(imageUrl: string): string {
    if (this.publicUrl && imageUrl.startsWith(this.publicUrl)) {
      return imageUrl.slice(this.publicUrl.length + 1);
    }
    const marker = '/file/';
    const idx = imageUrl.indexOf(marker);
    if (idx !== -1) {
      return imageUrl.substring(idx + marker.length).split('/').slice(1).join('/');
    }
    return imageUrl;
  }

  async sign(imageUrl: string, expiresIn = 3600): Promise<string> {
    const key = this.extractKey(imageUrl);
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
    } catch (err) {
      this.logger.error(`failed to generate signed URL for ${key}`, err as Error);
      // on failure we return the original url instead of crashing the request
      return imageUrl;
    }
  }
}
