import { RequestHandler } from 'express';
import * as Q from 'queue';

export class Queue {
  readonly queue: Q.default;

  _inflightRequest = 0;

  constructor(
    readonly config: {
      inFlightLimit: number;
      quit?: boolean;
    },
  ) {
    this.queue = new Q.default({
      autostart: true,
      concurrency: config.inFlightLimit,
    });
    this.queue.on('start', (job) => {
      this._inflightRequest++;
      job.prototype.logger('event', 'start');
    });
    this.queue.on('success', (_result, job) => {
      this._inflightRequest--;
      job.prototype.logger('event', 'success');
    });
    this.queue.on('error', (_err, job) => {
      this._inflightRequest--;
      job.prototype.logger('event', 'error');
    });
  }

  status() {
    return {
      inflight: this._inflightRequest,
      pending: this.queue.length - this._inflightRequest,
      total: this.queue.length,
    };
  }

  prometheusStatus(prefix: string): string {
    const status = this.status();
    return [
      [
        '# HELP inflight connections',
        `# TYPE ${prefix}_inflight gauge`,
        `${prefix}_inflight{} ${status.inflight}`,
      ].join('\n'),
      [
        '# HELP pending connections',
        `# TYPE ${prefix}_pending gauge`,
        `${prefix}_pending{} ${status.pending}`,
      ].join('\n'),
      [
        '# HELP total connections',
        `# TYPE ${prefix}_queued gauge`,
        `${prefix}_total{} ${status.total}`,
      ].join('\n'),
    ].join('\n');
  }

  middleware(): RequestHandler {
    return (_req, res, next) => {
      const logger = this.loggerGenerator();

      function job(cb?: Q.QueueWorkerCallback) {
        if (!cb) return next();

        const _end = res.end;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        res.end = (a, b, c) => {
          cb();
          return _end.call(res, a, b, c);
        };
        next();
      }
      job.prototype.logger = logger;

      this.queue.push(job);
      logger('middleware', 'setup');
    };
  }

  loggerGenerator() {
    const id = (Math.random() * 10000).toFixed(0).toString().padStart(4, '0');
    return (type: string, msg: string) => {
      if (this.config.quit === true) return;
      const now = new Date();
      const nowTime = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((e) => e.toString().padStart(2, '0'))
        .join(':');
      const nowM = now.getMilliseconds().toString().padStart(3, '0');
      const status = `${this._inflightRequest}:${this.queue.length}`;
      console.log([nowTime + '.' + nowM, id, status, type, msg].join('\t'));
    };
  }
}
