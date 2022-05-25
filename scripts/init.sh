#!/bin/bash

rm -rf log/nginx
rm -rf log/app

mkdir log/app

docker-compose up -d
docker-compose -f docker-compose.monitor.yaml -p ac-monitor up -d

