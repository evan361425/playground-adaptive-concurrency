1. rate limit 的缺點
   1. 無法阻止負載超量
   2. 強制限制
   3. 定死
2. what happens?
   1. inflight = rate \* latency
   2. = 15 \* 0.5 (o)
   3. = 15 \* 0.6 (o)
   4. = 15 \* 0.7 (x)

先看 without adaptive 再看 with

little laws

---

rate 一樣，上游出問題，APIm 卻要承擔 connection 的量，進而影響其他服務

adaptive congestion - backoff!
