import { request } from 'http';

const responses: Record<string, number> = {};

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/wait/800',
  method: 'GET',
};

function makeRequests(count: number) {
  while (count--) {
    request(options, (res) => {
      const c = res.statusCode ?? 0;
      responses[c] = (responses[c] ?? 0) + 1;
    }).end();
  }
}

function main() {
  let epoch = 0;
  setInterval(() => {
    const log = Object.entries(responses)
      .map((e) => `${e[0]} ${e[1]}`)
      .join('\t');
    console.log(`Epoch ${epoch++}\t` + log);

    makeRequests(15);
  }, 1000);
}

main();
