import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagEntity, TagSchema } from './schemas/tag.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: TagEntity.name, schema: TagSchema }])],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
