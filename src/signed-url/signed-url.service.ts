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

  // l'URL stockée en base est l'URL publique (https://.../file/<bucket>/<key>) ;
  // on en extrait la clé d'objet B2 (objects/xxx.png) pour signer
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
      this.logger.error(`échec génération URL signée pour ${key}`, err as Error);
      // en cas de pépin on rend l'URL d'origine plutôt que de planter la requête
      return imageUrl;
    }
  }
}
