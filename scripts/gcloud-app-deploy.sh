#!/usr/bin/env bash
echo "GOOGLE CLOUD APP ENGINE DEPLOYMENT"

service_name=$1
printf "`cat app.yaml`\nservice: $service_name"  > temp.yaml

gcloud auth activate-service-account --key-file service-keyfile.json
gcloud -q app deploy --project=simple-riqum --image-url=asia.gcr.io/simple-riqum/simple-riqum-service temp.yaml --no-promote
#
echo "Removing temporary service app descriptor..."
rm temp.yaml
echo "ok"
