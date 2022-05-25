import { ArgumentParser } from 'argparse';
import { request } from 'http';

type Args = {
  host: string;
  port: number;
  execute: number;
  rate: number;
  duration: number;
};

function parseArgs(): Args {
  const parser = new ArgumentParser({
    description: 'Run simple server with some configurable features',
  });

  parser.add_argument('--host', {
    default: 'localhost',
    help: 'Server host',
  });
  parser.add_argument('-p', '--port', {
    default: 8080,
    type: 'int',
    help: 'Server port',
  });
  parser.add_argument('-e', '--execute', {
    default: 1000,
    type: 'int',
    help: 'How long(ms) will the request execute in server(not include pending)',
  });
  parser.add_argument('-r', '--rate', {
    default: 10,
    type: 'int',
    help: 'Requests per second rate',
  });
  parser.add_argument('-d', '--duration', {
    default: 15,
    type: 'int',
    help: 'How many seconds you want to run, 0 means forever',
  });

  return parser.parse_args();
}

function main() {
  const args = parseArgs();
  const httpOptions = {
    hostname: args.host,
    port: args.port,
    path: '/wait/' + args.execute,
    method: 'GET',
  };

  let startedEpoch = 0;
  let totalResponse = 0;
  const responses: Record<string, number> = {};

  function makeRequests(count: number) {
    while (count--) {
      request(httpOptions, (res) => {
        const c = res.statusCode ?? 0;
        responses[c] = (responses[c] ?? 0) + 1;
        totalResponse++;

        if (totalResponse % args.rate === 0) {
          const epoch = (totalResponse / args.rate).toFixed(0);
          const log = Object.entries(responses)
            .map((e) => `${e[0]} ${e[1]}`)
            .join('\t');
          console.log(`Finish epoch ${epoch}\t` + log);
        }
      })
        .on('error', (_err) => null)
        .end();
    }
  }

  const interval = setInterval(() => {
    args.duration === ++startedEpoch && clearInterval(interval);
    console.log(`Start epoch ${startedEpoch}`);
    makeRequests(args.rate);
  }, 1000);

  process.on('SIGINT', () => {
    console.log('===== STOP SENDING REQUESTS =====');
    clearInterval(interval);
  });
}

main();
