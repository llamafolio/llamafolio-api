#!/usr/bin/env bash

#
# This is specifically for running tests in CI (GitHub Actions) on pull requests
# This is needed to make serverless-offline work in CI
#

set -o xtrace pipefail

#
# if port 3034 is already in use, kill it
# lsof -i:3034 | awk 'NR!=1 {print $2}' | xargs kill || true

export STAGE="local"
export API_URL="http://127.0.0.1:3035"

#
# start serverless-offline
./node_modules/.bin/sls offline --host 127.0.0.1 --httpPort 3035 &
#
# wait for serverless-offline to start
# https://explainshell.com/explain?cmd=timeout+20+bash+-c+%27until+echo+%3E%2Fdev%2Ftcp%2F0.0.0.0%2F3034%3B+do+sleep+1%3B+done%27+%7C%7C+true
#
timeout 20 bash -c 'until echo >/dev/tcp/127.0.0.1/3035; do sleep 1; done' || true
#
# run tests
#
node_modules/.bin/vitest --run

#
# kill serverless-offline
lsof -i:3034 | awk 'NR!=1 {print $2}' | xargs kill || true