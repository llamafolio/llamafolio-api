#!/usr/bin/env bash

#
# This is specifically for running tests in CI (GitHub Actions) on pull requests
# This is needed to make serverless-offline work in CI
#

export STAGE="local"

#
# start serverless-offline
./node_modules/.bin/sls offline --host 127.0.0.1 --httpPort 3034 --verbose --debug='*' &
#
# keep checking if serverless-offline is up
while true; do
  curl --request GET --silent --url http://127.0.0.1:3034 > /dev/null
  if [ $? -eq 0 ]; then
    break
  fi
  echo "serverless-offline is not up yet. Status code: $?. Retrying in 0.2 seconds..."
  sleep 0.2
done

echo "serverless-offline is up. Status code: $?"

sleep 1

# clear screen logs
clear

#
# run tests
./node_modules/.bin/bun test test/**/*.test.ts

#
# kill serverless-offline (port 3034)
(lsof -ti tcp:3034 | xargs kill || lsof -ti tcp:3034 | xargs kill -9) || true