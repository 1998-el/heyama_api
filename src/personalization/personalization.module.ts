import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PostEntity, PostSchema } from '../posts/schemas/post.schema';
import { InteractionsModule } from '../interactions/interactions.module';
import { PersonalizationService } from './personalization.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PostEntity.name, schema: PostSchema }]),
    InteractionsModule,
  ],
  providers: [PersonalizationService],
  exports: [PersonalizationService],
})
export class PersonalizationModule {}

