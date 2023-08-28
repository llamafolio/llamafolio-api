import { deleteAdapterById } from '@db/adapters'
import { connect } from '@db/clickhouse'
import { deleteContractsByAdapterId } from '@db/contracts'
import { deleteProtocol } from '@db/protocols'

function help() {
  console.log('pnpm run delete-adapter {adapter}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: delete-adapter.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const adapterId = process.argv[2]

  try {
    const client = connect()

    await deleteAdapterById(client, adapterId)

    await deleteProtocol(client, adapterId)

    await deleteContractsByAdapterId(client, adapterId)
  } catch (e) {
    console.log('Failed to delete adapter', e)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
