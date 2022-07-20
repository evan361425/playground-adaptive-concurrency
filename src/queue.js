const { RequestHandler } = require('express');
const QueueLib = require('queue');

class Queue {
  /**
   * @var {QueueLib.default}
   */
  queue;

  /**
   * @typedef Config
   * @property {number} inFlightLimit
   * @property {boolean} quiet
   * @var {Config}
   */
  config;

  #inflightRequest = 0;

  /**
   * @param {Config} config
   */
  constructor(config) {
    this.config = config;

    this.queue = new QueueLib.default({
      autostart: true,
      concurrency: config.inFlightLimit,
    });
    this.queue.on('start', (job) => {
      this.#inflightRequest++;
      job.prototype.logger('event', 'start');
    });
    this.queue.on('success', (_result, job) => {
      this.#inflightRequest--;
      job.prototype.logger('event', 'success');
    });
    this.queue.on('error', (_err, job) => {
      this.#inflightRequest--;
      job.prototype.logger('event', 'error');
    });
  }

  /**
   * @returns {number}
   */
  get ifr() {
    return this.#inflightRequest;
  }

  /**
   * @typedef Status
   * @property {number} inflight
   * @property {number} pending
   * @property {number} total
   * @returns {Status}
   */
  status() {
    return {
      inflight: this.ifr,
      pending: this.queue.length - this.ifr,
      total: this.queue.length,
    };
  }

  /**
   * @param {string} prefix
   * @returns {string}
   */
  prometheusStatus(prefix) {
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

  /**
   * @return {RequestHandler}
   */
  middleware() {
    return (_req, res, next) => {
      const logger = this.loggerGenerator();

      /**
       *
       * @param {function} cb
       * @returns {void}
       */
      function job(cb) {
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
    /**
     * @param {string} type
     * @param {string} msg
     */
    return (type, msg) => {
      if (this.config.quiet === true) return;
      const now = new Date();
      const nowTime = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((e) => e.toString().padStart(2, '0'))
        .join(':');
      const nowM = now.getMilliseconds().toString().padStart(3, '0');
      const status = `${this.ifr}:${this.queue.length}`;
      console.log([nowTime + '.' + nowM, id, status, type, msg].join('\t'));
    };
  }
}

module.exports = { Queue };
