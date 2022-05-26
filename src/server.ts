import { ArgumentParser } from 'argparse';
import express from 'express';
import { appendFile } from 'fs';
import { Queue } from './queue';

function parseArgs(): {
  host: string;
  port: number;
  inflight: number;
  duration: number;
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
  parser.add_argument('-d', '--duration', {
    default: process.env.APP_DURATION ?? 1000,
    type: 'int',
    help: 'Each request duration in milliseconds',
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

function wait(ms: number, jitter: number): Promise<void> {
  // between -jitter ~ jitter
  const random = Math.ceil((Math.random() * 2 - 1) * jitter);
  return new Promise((res) => setTimeout(res, ms + random));
}

function writeMetrics(file: string, queue: Queue) {
  const data = JSON.stringify({ timestamp: Date.now(), ...queue.status() });
  appendFile(file, '{"app":' + data + '}\n', () => null);
}

function main() {
  const args = parseArgs();
  console.log(JSON.stringify({ config: args }, undefined, 2));

  const app = express();
  const queue = new Queue({ inFlightLimit: args.inflight, quit: args.quit });

  app.get('/', queue.middleware(), async (_req, res) => {
    await wait(args.duration, args.jitter);
    res.send('OK');
  });
  app.get('/wait/:ms', queue.middleware(), async (req, res) => {
    const ms = parseInt(req.params.ms, 10);
    await wait(isNaN(ms) ? args.duration : ms, args.jitter);
    res.send('OK');
  });

  app.listen(args.port, args.host);

  setInterval(writeMetrics, args.metricsPeriod, args.metricsFile, queue);
}

main();
