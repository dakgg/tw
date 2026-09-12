import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TravelController } from './travel.controller';
import { TravelService } from './travel.service';
import { CollectionQueueService } from './collection-queue.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TravelController],
  providers: [TravelService, CollectionQueueService],
})
export class AppModule {}
