#!/usr/bin/env bash

set -eou pipefail

# This script is used to check against lambda endpoints to ensure they are working as expected.

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/adapters

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/tokens

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/contracts/0x0d8775f648430679a709e98d2b0cb6250d2887ef

# curl --head \
#   --request GET \
#   --silent \
#   --show-error \
#   --fail \
#   --url https://api.llamafolio.com/gas_price/ethereum/chart

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/history/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/info/stats

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/info/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/labels/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/protocols

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/protocols/lates
curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/snapshots/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/sync_status

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/tokens/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/tokens/ethereum/0x6b175474e89094c44da98b954eedeac495271d0f

curl --head \
  --request GET \
  --silent \
  --show-error \
  --fail \
  --url https://api.llamafolio.com/holders/0x6b175474e89094c44da98b954eedeac495271d0f
