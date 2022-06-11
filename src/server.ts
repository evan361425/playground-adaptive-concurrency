import { ArgumentParser } from 'argparse';
import express from 'express';
import { appendFile } from 'fs';
import { Queue } from './queue';

function parseArgs(): {
  host: string;
  port: number;
  inflight: number;
  jitter: number;
  quit?: true;
  metricsFile: string;
  metricsPeriod: number;
} {
  const parser = new ArgumentParser({
    description: 'Run simple server with some configurable features',
  });

  parser.add_argument('--host', {
    default: process.env.APP_HOST ?? 'localhost',
    help: 'Server host',
  });
  parser.add_argument('-p', '--port', {
    default: process.env.APP_PORT ?? 8000,
    type: 'int',
    help: 'Server port',
  });
  parser.add_argument('-f', '--inflight', {
    default: process.env.APP_INFLIGHT ?? 10,
    type: 'int',
    help: 'Inflight requests limit',
  });
  parser.add_argument('-j', '--jitter', {
    default: process.env.APP_JITTER ?? 50,
    type: 'int',
    help: 'Duration jitter milliseconds',
  });
  parser.add_argument('-q', '--quit', {
    action: 'store_true',
    help: 'No log on queue status',
  });
  parser.add_argument('--metricsFile', {
    default: process.env.APP_METRICS_FILE ?? 'log/app/metrics.log',
    help: 'Metrics append file',
  });
  parser.add_argument('--metricsPeriod', {
    default: process.env.APP_METRICS_PERIOD ?? 500,
    type: 'int',
    help: 'Metrics scrape period(ms)',
  });

  return parser.parse_args();
}

function wait(ms: number, jitter: number, offset = 0): Promise<void> {
  // between -jitter ~ jitter
  const random = Math.ceil((Math.random() * 2 - 1) * jitter);
  return new Promise((res) => setTimeout(res, offset + ms + random));
}

function str2num(value: string): number {
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

function writeMetrics(file: string, queues: Queue[]) {
  const merged = queues
    .map((queue) => queue.status())
    .reduce((prev, curr) => ({
      inflight: prev.inflight + curr.inflight,
      pending: prev.pending + curr.pending,
      total: prev.total + curr.total,
    }));
  const data = JSON.stringify({ timestamp: Date.now(), ...merged });
  appendFile(file, '{"app":' + data + '}\n', () => null);
}

function main() {
  const args = parseArgs();
  console.log(JSON.stringify({ config: args }, undefined, 2));

  const app = express();
  const limitedQueue = new Queue({
    inFlightLimit: args.inflight,
    quit: args.quit,
  });
  const queue = new Queue({ quit: args.quit });

  app.get('/', async (_req, res) => {
    await wait(0, args.jitter);
    res.send('OK');
  });
  app.get('/wait/:ms', queue.middleware(), async (req, res) => {
    await wait(str2num(req.params.ms), args.jitter);
    res.send('OK');
  });
  app.get('/wait-limited/:ms', limitedQueue.middleware(), async (req, res) => {
    await wait(str2num(req.params.ms), args.jitter);
    res.send('OK');
  });

  app.listen(args.port, args.host);

  setInterval(writeMetrics, args.metricsPeriod, args.metricsFile, [
    queue,
    limitedQueue,
  ]);
}

main();
