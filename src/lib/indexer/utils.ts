import environment from '@environment'

const { INDEXER_ADMIN_TOKEN } = environment

export const HASURA_HEADERS = {
  'x-hasura-admin-secret': INDEXER_ADMIN_TOKEN,
}
