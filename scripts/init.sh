#!/bin/bash

docker-compose up -d
docker-compose -f docker-compose.monitor.yaml -p ac-monitor up -d

