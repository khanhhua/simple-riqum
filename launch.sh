#!/usr/bin/env bash

if [ ! -f ./service-keyfile.json ]; then
    echo "Please ensure that file 'service-keyfile.json' exists in ./scripts directory. See README.md"
fi

mkdir -p data
openssl genrsa -out data/privkey.pem 2048; openssl rsa -in data/privkey.pem -pubout -out data/pubkey.pem

docker-compose build
docker-compose up
