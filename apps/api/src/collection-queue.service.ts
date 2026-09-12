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
      this.logger.warn('REDIS_URL이 없어 인메모리 데모 모드로 실행합니다.');
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
      return { queued: false, mode: 'demo', jobs: COLLECTIONS, message: 'REDIS_URL 설정 시 BullMQ에 등록됩니다.' };
    }
    const jobs = await Promise.all(COLLECTIONS.map((name) => this.queue!.add(name, {}, { removeOnComplete: 100, attempts: 3 })));
    return { queued: true, jobs: jobs.map((job) => ({ id: job.id, name: job.name })) };
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async collect(kind: string) {
    // 공급자 어댑터 연결 지점: 정규화한 뒤 Prisma snapshot 테이블에 저장합니다.
    this.logger.log(`${kind} 수집 완료 (demo provider)`);
    return { kind, collectedAt: new Date().toISOString() };
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
