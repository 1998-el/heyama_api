import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ObjectsController } from './objects.controller';
import { ObjectsService } from './objects.service';
import { ObjectEntity, ObjectSchema } from './schemas/object.schema';
import { UploadModule } from '../upload/upload.module';
import { SocketModule } from '../socket/socket.module';
import { SignedUrlModule } from '../signed-url/signed-url.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ObjectEntity.name, schema: ObjectSchema }]),
    UploadModule,
    SocketModule,
    SignedUrlModule,
  ],
  controllers: [ObjectsController],
  providers: [ObjectsService],
})
export class ObjectsModule {}
