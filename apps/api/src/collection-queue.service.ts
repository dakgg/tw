import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Job, Queue, Worker } from 'bullmq';

const COLLECTIONS = ['foreign-holidays', 'inbound-demand', 'market-rates'] as const;

@Injectable()
export class CollectionQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CollectionQueueService.name);
  private queue?: Queue;
  private worker?: Worker;

  onModuleInit() {
    if (!process.env.REDIS_URL) {
      this.logger.warn('REDIS_URL이 없어 수집 큐를 비활성화합니다.');
      return;
    }
    const connection = this.redisConnection(process.env.REDIS_URL);
    this.queue = new Queue('travel-collection', { connection });
    this.worker = new Worker('travel-collection', (job: Job) => this.collect(job.name), { connection });
    this.worker.on('failed', (job, error) => this.logger.error(`${job?.name} 실패: ${error.message}`));
  }

  @Cron('0 0 */6 * * *')
  async scheduledCollection() {
    await this.enqueueAll();
  }

  async enqueueAll() {
    if (!this.queue) {
      return { queued: false, jobs: [], message: 'REDIS_URL이 없어 수집 큐가 비활성화되어 있습니다.' };
    }
    const jobs = await Promise.all(COLLECTIONS.map((name) => this.queue!.add(name, {}, { removeOnComplete: 100, attempts: 3 })));
    return { queued: true, jobs: jobs.map((job) => ({ id: job.id, name: job.name })) };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async collect(kind: string) {
    throw new Error(`${kind} 수집 공급자가 설정되지 않았습니다.`);
  }

  private redisConnection(redisUrl: string) {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: url.username || undefined,
      password: url.password || undefined,
      maxRetriesPerRequest: null,
    };
  }
}
