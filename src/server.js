const { ArgumentParser } = require('argparse');
const express = require('express');
const { appendFile } = require('fs');
const { Queue } = require('./queue');

/**
 * @typedef {object} Args
 * @property {string} host
 * @property {number} port
 * @property {number} inflight
 * @property {number} jitter
 * @property {string|number} wait
 * @property {true} quiet
 * @property {string} metricsFile
 * @property {number} metricsPeriod
 */

/**
 * @returns {Args}
 */
function parseArgs() {
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
  parser.add_argument('-w', '--wait', {
    default: process.env.APP_WAIT ?? 500,
    type: 'int',
    help: 'How long the request wait(ms) in default',
  });
  parser.add_argument('-q', '--quiet', {
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

/**
 *
 * @param {number} ms
 * @param {number} jitter
 * @param {number} offset
 * @returns {Promise<void>}
 */
function wait(ms, jitter, offset = 0) {
  // between -jitter ~ jitter
  const random = Math.ceil((Math.random() * 2 - 1) * jitter);
  return new Promise((res) => setTimeout(res, offset + ms + random));
}

/**
 * @param {string|number} value
 * @returns {number}
 */
function str2num(value) {
  if (typeof value === 'number') return value;

  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

/**
 * @param {string} file
 * @param {Queue[]} queues
 */
function writeMetrics(file, queues) {
  const merged = queues
    .map((queue) => queue.status())
    .reduce((prev, curr) => ({
      inflight: prev.inflight + curr.inflight,
      pending: prev.pending + curr.pending,
      total: prev.total + curr.total,
    }));
  // if (merged.total === 0) return;
  const data = JSON.stringify({ timestamp: Date.now(), ...merged });
  appendFile(file, '{"app":' + data + '}\n', () => null);
}

function main() {
  const args = parseArgs();
  console.log(JSON.stringify({ config: args }, undefined, 2));

  const app = express();
  const queue = new Queue({
    inFlightLimit: args.inflight,
    quiet: args.quiet,
  });

  app.get('/', async (_req, res) => {
    await wait(0, args.jitter);
    res.send('OK');
  });
  app.get('/set-wait/:ms', queue.middleware(), async (req, res) => {
    args.wait = req.params.ms;
    res.send('OK');
  });
  app.get('/wait/:ms?', queue.middleware(), async (req, res) => {
    await wait(str2num(req.params.ms ?? args.wait), args.jitter);
    res.send('OK');
  });

  app.listen(args.port, args.host);

  setInterval(writeMetrics, args.metricsPeriod, args.metricsFile, [queue]);
}

main();
