import { INDEXER_ACCESS_TOKEN } from 'env'

export const INDEXER_HEADERS = {
  'x-hasura-admin-secret': INDEXER_ACCESS_TOKEN,
}
