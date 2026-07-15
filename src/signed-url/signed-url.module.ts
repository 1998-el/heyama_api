import { Module } from '@nestjs/common';
import { SignedUrlService } from './signed-url.service';

@Module({
  providers: [SignedUrlService],
  exports: [SignedUrlService],
})
export class SignedUrlModule {}
