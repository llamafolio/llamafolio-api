#!/usr/bin/env bash

set -eoux pipefail

# This script is used to check against lambda endpoints to ensure they are working as expected.

curl --request GET \
  --url $API_URL/adapters

curl --request GET \
  --url $API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --request GET \
  --url $API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest

curl --request GET \
  --url $API_URL/balances/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/tokens

curl --request GET \
  --url $API_URL/contracts/0x0d8775f648430679a709e98d2b0cb6250d2887ef

curl --request GET \
  --url $API_URL/gas_price/ethereum/chart

curl --request GET \
  --url $API_URL/history/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --request GET \
  --url $API_URL/info/stats

curl --request GET \
  --url $API_URL/info/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --request GET \
  --url $API_URL/labels/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --request GET \
  --url $API_URL/protocols

curl --request GET \
  --url $API_URL/protocols/latest

curl --request GET \
  --url $API_URL/snapshots/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50/latest

curl --request GET \
  --url $API_URL/sync_status

curl --request GET \
  --url $API_URL/tokens/0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50

curl --request GET \
  --url $API_URL/tokens/ethereum/0x6b175474e89094c44da98b954eedeac495271d0f

curl --request GET \
  --url $API_URL/holders/0x6b175474e89094c44da98b954eedeac495271d0f