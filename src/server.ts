import { ArgumentParser } from 'argparse';
import express from 'express';

function parseArgs(): {
  host: string;
  port: number;
  connections: number;
  duration: number;
  jitter: number;
} {
  const parser = new ArgumentParser({
    description: 'Run simple server with some configurable features',
  });

  parser.add_argument('--host', {
    default: 'localhost',
    help: 'Server host',
  });
  parser.add_argument('-p', '--port', {
    default: 8000,
    type: 'int',
    help: 'Server port',
  });
  parser.add_argument('-c', '--connections', {
    default: 10,
    type: 'int',
    help: 'Maximum connections to use',
  });
  parser.add_argument('-d', '--duration', {
    default: 1000,
    type: 'int',
    help: 'Each request duration in milliseconds',
  });
  parser.add_argument('-j', '--jitter', {
    default: 50,
    type: 'int',
    help: 'Duration jitter milliseconds',
  });

  return parser.parse_args();
}

function wait(ms: number, jitter: number): Promise<void> {
  // between -jitter ~ jitter
  const random = Math.ceil((Math.random() * 2 - 1) * jitter);
  return new Promise((res) => setTimeout(res, ms + random));
}

function main() {
  const args = parseArgs();
  console.log(`Using configuration: \n${JSON.stringify(args, undefined, 2)}`);

  const app = express();

  app.get('/', async (_req, res) => {
    await wait(args.duration, args.jitter);
    res.send('OK');
  });
  app.get('/wait/:ms', async (req, res) => {
    await wait(parseInt(req.params.ms, 10), args.jitter);
    res.send('OK');
  });

  const server = app.listen(args.port, args.host);
  server.maxConnections = args.connections;
}

main();
