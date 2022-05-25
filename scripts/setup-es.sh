#!/bin/bash

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

