import { INDEXER_ADMIN_TOKEN } from '@env'

export const HASURA_HEADERS = {
  'x-hasura-admin-secret': INDEXER_ADMIN_TOKEN,
}
