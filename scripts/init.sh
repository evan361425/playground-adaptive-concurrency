#!/bin/bash

rm -rf log/nginx
rm -rf log/app
rm -rf log/openresty

mkdir -p log/app

docker-compose up -d
docker-compose -f docker-compose.monitor.yaml -p ac-monitor up -d

echo "========== Start Custom Setting =========="

printf "Elastic Search health checking"
while : ; do
  printf "."

  curl localhost:9200/_cat/health -s > /dev/null
  res=$?
  if test "$res" == "0"; then
    echo " Done!"
    break;
  fi

  sleep 3
done

# https://www.elastic.co/guide/en/beats/filebeat/current/configuring-ingest-node.html
curl -X PUT "localhost:9200/_ingest/pipeline/filebeat_nginx" \
  -H 'Content-Type: application/json' -d'
{
  "description": "Use nginx timestamp",
  "processors": [
    {
      "date": {
        "field": "log.nginx.timestamp",
        "formats": [
          "UNIX"
        ],
        "ignore_failure": true
      }
    }
  ]
}
'

echo ""
curl -X PUT "localhost:9200/_ingest/pipeline/filebeat_app" \
  -H 'Content-Type: application/json' -d'
{
  "description": "Use app timestamp",
  "processors": [
    {
      "date": {
        "field": "log.app.timestamp",
        "formats": [
          "UNIX_MS"
        ],
        "ignore_failure": true
      }
    }
  ]
}
'

