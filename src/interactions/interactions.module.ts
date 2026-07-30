import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InteractionEntity, InteractionSchema } from './schemas/interaction.schema';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: InteractionEntity.name, schema: InteractionSchema }]),
  ],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}

