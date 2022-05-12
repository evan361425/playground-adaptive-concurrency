#!/bin/bash

docker-compose -f docker-compose.monitor.yaml -p ac-monitor down -v
docker-compose down -v
rm -rf log
