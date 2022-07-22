const { ArgumentParser } = require('argparse');
const { request } = require('http');

/**
 * @typedef {object} Args
 * @property {string} host
 * @property {number} port
 * @property {string} path
 * @property {string} name
 * @property {number} wait
 * @property {number} rate
 * @property {number} duration
 * @property {number} timeout
 */

/**
 * @returns {Args}
 */
function parseArgs() {
  const parser = new ArgumentParser({
    description: 'Run simple server with some configurable features',
  });

  parser.add_argument('--host', {
    default: 'localhost',
    help: 'Server host, default: localhost',
  });
  parser.add_argument('--port', {
    default: 8080,
    type: 'int',
    help: 'Server port, default: 8080',
  });
  parser.add_argument('-p', '--path', {
    default: '/wait',
    help: 'Server path, default: /wait',
  });
  parser.add_argument('-n', '--name', {
    default: 'A',
    help: 'Client name, default: A',
  });
  parser.add_argument('-w', '--wait', {
    default: 1000,
    type: 'int',
    help: 'How long(ms) will the request execute in server, default: 1000',
  });
  parser.add_argument('-r', '--rate', {
    default: 10,
    type: 'int',
    help: 'Requests per second rate, default: 10',
  });
  parser.add_argument('-d', '--duration', {
    default: 120,
    type: 'int',
    help: 'How many seconds you want to run, 0 means forever, default: 120',
  });
  parser.add_argument('-t', '--timeout', {
    default: 30000,
    type: 'int',
    help: 'Timeout ms, default: 30000',
  });

  return parser.parse_args();
}

function main() {
  const args = parseArgs();
  const path = args.wait === 0 ? '' : '/' + args.wait;
  const httpOptions = {
    hostname: args.host,
    port: args.port,
    path: args.path + path,
    timeout: args.timeout,
    method: 'GET',
    headers: {
      'x-client-name': args.name,
    },
  };

  let startedEpoch = 0;
  let totalResponse = 0;

  /**
   * @var {map<number, number>}
   */
  const responses = {};

  /**
   * @param {number} count
   */
  function makeRequests(count) {
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
