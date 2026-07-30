import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import { AuthorEntity, AuthorSchema } from './schemas/author.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: AuthorEntity.name, schema: AuthorSchema }])],
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
