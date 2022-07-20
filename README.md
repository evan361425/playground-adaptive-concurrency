# Adaptive Concurrency

Using Nginx and Express.js to play with adaptive concurrency.

若需要知道緣起，請看相關[文章](https://evan361425.github.io/feedback/adaptive-concurrency/)。

## Instrument

你需要安裝

-   [Docker](https://docs.docker.com/get-docker/)，然後把他啟動起來。你可以透過 `docker info` 來檢查他有沒有啟動。
-   docker-compose，除非你特別指定，不然安裝 Docker 時會一起包進去，所以免煩惱。
-   [Node.js](https://nodejs.org/en/download/)，且要在 v14 以上，你可以透過 `node --version` 來檢查你的環境。

然後下載一下相關套件，執行時間根據你的網路狀況而定，不過套件並不多就是了。

```bash
npm i
```

當你完成環境準備後就可以把相關服務啟動起來了，這通常需要一陣子，因為要等 elasticsearch 啟動起來。

```bash
bash scripts/init.sh
```

這個指令是 bash 和 shell 都吃的，但是如果是 windows 就天助你也（有需求再寫 powershell）。

## Play

你可以開始玩了！

1. Go to <http://localhost:3000/d/z2F_vwl7z/demo?orgId=1> for Grafana (account/password: admin/evan)
2. Do some client things

```shell
node src/client.js -w 700 -r 15 -d 5 --port 8000
```

client 的參數有：

-   `-w/--waitTime`，每個請求等待多久，_預設 1 秒_
-   `-r/--rate`，每秒幾個請求（使用不同的連線），_預設 10 個_
-   `-n/--name`，這個 client 的名稱，_預設為 A_
-   `-d/--duration`，持續多久，0 代表一直持續，_預設 15 秒_
-   `-t/--timeout`，_預設 30 秒_
-   `--host`，_預設 localhost_
-   `--port`，_預設 8080_

server 的行為：

-   server 每秒只能處理 10 個請求，且每個請求時間都會加上 50 毫秒的 jitter，並且每 0.5 秒輸出一次 metrics。
-   nginx 的 timeout 在[設定檔](./config/nginx.conf)中寫為 4s。
-   lua-nginx(openresty) 的 timeout 卻是 2s，這是為了能快速看到適應性並行處理的效果。

啟動的應用程式面服務有：

-   8000 port 的 server
-   8080 port 的 nginx without adaptive-concurrency
-   8081 port 的 lua-nginx，且名稱為 A
-   8082 port 的 lua-nginx，且名稱為 B

啟動的維運服務有：

-   3000 port 的 Grafana
-   9200 port 的 elasticsearch
-   Filebeat

## Rubbing

```bash
bash scripts/done.sh
```

註：雖然是打掃，但實際一些檔案系統的東西不會清，而是在 init 時清，因為我有時候會想看一下之前跑的 log。
