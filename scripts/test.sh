#!/usr/bin/env bash

#
# This is specifically for running tests in CI (GitHub Actions) on pull requests
# This is needed to make serverless-offline work in CI
#

set -o xtrace pipefail

#
# if port 3034 is already in use, kill it
lsof -i :3034 | awk 'NR!=1 {print $2}' | xargs kill || true

#
# start serverless-offline
./node_modules/.bin/sls offline --httpPort 3034 &
#
# wait for serverless-offline to start
# https://explainshell.com/explain?cmd=timeout+20+bash+-c+%27until+echo+%3E%2Fdev%2Ftcp%2F0.0.0.0%2F3034%3B+do+sleep+1%3B+done%27+%7C%7C+true
#
timeout 20 bash -c 'until echo >/dev/tcp/0.0.0.0/3034; do sleep 1; done' || true
#
# run tests
#
node_modules/.bin/vitest --run