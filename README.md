# Adaptive Concurrency

Using Nginx and Express.js to play with adaptive concurrency.

若需要知道緣起，請看相關[文章](https://evan361425.github.io/feedback/adaptive-concurrency/)。

## Instrument

你需要安裝

-   [Docker](https://docs.docker.com/get-docker/)，然後把他啟動起來。你可以透過 `docker info` 來檢查他有沒有啟動。
-   docker-compose，除非你特別指定，不然安裝 Docker 時會一起包進去，所以免煩惱。
-   [Node.js](https://nodejs.org/en/download/)，且要在 v14 以上，你可以透過 `node --version` 來檢查你的環境。

然後下載一下相關套件，這通常會需要一陣子，根據你的網路狀況而定，不過套件並不多就是了，主要是 TypeScript 和 lint 的東西。

```bash
npm i && npm run compile
```

## Play

你可以開始玩了！

```bash
bash scripts/init.sh
```

這個指令是 bash 和 shell 都吃的，但是如果是 windows 就天助你也（有需求再寫 powershell）。

1. Go to <http://localhost:3000> for Grafana (account/password: admin/evan)
2. Do some client things

```js
node dist/client.js -p /wait-limited -w 700 -r 15 -d 0 --port 8081
```

## Bream

```bash
bash scripts/done.sh
```

註：雖然是打掃，但實際一些檔案系統的東西不會清，而是在 init 時清，因為我有時候會想看一下之前跑的 log。
