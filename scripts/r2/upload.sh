#!/usr/bin/env bash

# This script uploads a file to a Cloudflare R2 bucket
# Currently being used to fetch and store NFT collections data from DefiLlama API

set -eou pipefail

trap 'echo "See example usage at the bottom of the file"' ERR

FILE_PATH="${1:-$FILE_PATH}"
UPLOAD_PATH="${2:-$UPLOAD_PATH}"

[ -z "$FILE_PATH" ] && echo "You must supply FILE_PATH as an argument" && exit 1
[ -f "$FILE_PATH" ] || {
  echo "FILE_PATH must be a valid file path"
  exit 1
}
[ -z "$UPLOAD_PATH" ] && echo "You must supply UPLOAD_PATH as an argument" && exit 1

export CLOUDFLARE_S3_URL="$CLOUDFLARE_S3_URL"
export AWS_ACCESS_KEY_ID="$CLOUDFLARE_AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$CLOUDFLARE_AWS_SECRET_ACCESS_KEY"

[ -z "$CLOUDFLARE_S3_URL" ] && echo "CLOUDFLARE_S3_URL is required to run this script" && exit 1
[ -z "$AWS_ACCESS_KEY_ID" ] && echo "CLOUDFLARE_AWS_ACCESS_KEY_ID is required to run this script" && exit 1
[ -z "$AWS_SECRET_ACCESS_KEY" ] && echo "CLOUDFLARE_AWS_SECRET_ACCESS_KEY is required to run this script" && exit 1

# upload $FILE_PATH to Cloudflare R2 bucket
aws s3 --endpoint-url="$CLOUDFLARE_S3_URL" \
  --region='auto' \
  --acl='public-read' \
  cp "$FILE_PATH" s3://$UPLOAD_PATH

#
# Example usage:

# FILE_PATH='/tmp/llama_nft_collections.json' \
#   UPLOAD_PATH='nft/llama_nft_collections.json' \
#   CLOUDFLARE_S3_URL='...' \
#   CLOUDFLARE_AWS_ACCESS_KEY_ID='...' \
#   CLOUDFLARE_AWS_SECRET_ACCESS_KEY='...' \
#   /bin/bash upload.sh

# or

# CLOUDFLARE_S3_URL='...' \
#   CLOUDFLARE_AWS_ACCESS_KEY_ID='...' \
#   CLOUDFLARE_AWS_SECRET_ACCESS_KEY='...' \
#   /bin/bash upload.sh '/tmp/llama_nft_collections.json' 'nft/llama_nft_collections.json'
