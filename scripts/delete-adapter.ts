import { deleteAdapterById } from '@db/adapters'
import { client } from '@db/clickhouse'
import { deleteContractsByAdapterId } from '@db/contracts'
import { getChainId } from '@lib/chains'

function help() {
  console.log('pnpm run delete-adapter {adapter} {chain}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: delete-adapter.ts
  // argv[2]: adapter
  // argv[3]: chain
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const adapterId = process.argv[2]
  const chainId = getChainId(process.argv[3])
  if (chainId == null) {
    console.error(`Chain not found ${process.argv[3]}`)
    return
  }

  try {
    await deleteAdapterById(client, adapterId, chainId)

    await deleteContractsByAdapterId(client, adapterId, chainId)
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
