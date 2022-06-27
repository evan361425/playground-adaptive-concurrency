# Adaptive Concurrency

Using proxy and Express.js to playing adaptive concurrency

推薦連結：

- [啟蒙影片](https://www.youtube.com/watch?v=m64SWl9bfvk)
- [細節討論](https://tech.olx.com/load-shedding-with-nginx-using-adaptive-concurrency-control-part-2-d4e4ddb853be)

## Instrument

Provision

```bash
npm i && npm run compile
```

Start

```bash
bash scripts/init.sh
```

### Steps

1. Go to <http://localhost:3000> for Grafana (account/password: admin/evan)
2. Do some client things

```js
node dist/client.js -p /wait-limited -w 700 -r 15 -d 0 --port 8081
```

### Clean up

```bash
bash scripts/done.sh
```
