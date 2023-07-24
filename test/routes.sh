#!/usr/bin/env bash

set -eou pipefail

# This script is used to check against lambda endpoints to ensure they are working as expected.

# load .env if it exists (i.e., if running locally against localhost)
if [ -f .env ]; then
  source .env
fi

TEMP_RESULTS_FILE=$(mktemp)

# the endpoints to test
endpoints=(
  "$API_URL/adapters"
  "$API_URL/protocols"
  "$API_URL/info/stats"
  "$API_URL/sync_status"
  "$API_URL/protocols/latest"
  "$API_URL/nfts/0xb53F052f717A340147F71Fdd9659C2C008b35A52"
  "$API_URL/info/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50"
  "$API_URL/labels/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50"
  "$API_URL/tokens/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50"
  "$API_URL/history/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50"
  "$API_URL/holders/0x6b175474e89094c44da98b954eedeac495271d0f"
  "$API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50"
  "$API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest"
  "$API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/tokens"
  "$API_URL/tokens/ethereum/0x6b175474e89094c44da98b954eedeac495271d0f"
  "$API_URL/snapshots/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest"
)

for endpoint in "${endpoints[@]}"; do

  status_code=$(
    curl --head \
      --request GET \
      --silent \
      --fail \
      --url $endpoint \
      --write-out '%{http_code}' \
      --output /dev/null || true
  )

  if [ "$status_code" -ne 200 ]; then
    echo "$endpoint" >> $TEMP_RESULTS_FILE
  else
    echo "$endpoint - OK"
  fi

done

if [ -s "$TEMP_RESULTS_FILE" ]; then
  echo
  echo "The following endpoints did not return 200:"
  cat $TEMP_RESULTS_FILE
  rm -rf $TEMP_RESULTS_FILE
fi
