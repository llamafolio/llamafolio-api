import '../environment'

import { client } from '@db/clickhouse'
import { insertERC20Tokens, selectUndecodedChainAddresses } from '@db/tokens'
import type { BaseContext } from '@lib/adapter'
import { chainByChainId, getChainId } from '@lib/chains'
import { getTokenDetails } from '@lib/erc20'

const types = ['erc20', 'erc721', 'erc1155'] as const

function help() {
  console.log('pnpm run update-tokens {chain} {?type}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-tokens.ts
  // argv[2]: chain
  // argv[3]: type
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const chainId = getChainId(process.argv[2])
  if (chainId == null) {
    return console.error(`Invalid chain ${process.argv[2]}`)
  }

  const type = (process.argv[3] as 'erc20' | 'erc721' | 'erc1155') || 'erc20'
  if (!types.includes(type)) {
    return console.error(`Invalid type ${process.argv[3]}`)
  }

  const ctx: BaseContext = { chain: chainByChainId[chainId].id, adapterId: '' }

  try {
    const limit = 100
    let offset = 0

    for (;;) {
      console.log('Offset', offset)
      const rows = await selectUndecodedChainAddresses(client, chainId, type, limit, offset)
      if (rows.length === 0) {
        console.log(`Insert tokens done`)
        return
      }

      const addresses = rows.map((row) => row.address as `0x${string}`)

      const tokens = await getTokenDetails(ctx, addresses)

      // remove tokens without metadata
      const _tokens = tokens.filter((token) => token.decimals != null || token.name != null || token.symbol != null)

      console.log(_tokens)

      await insertERC20Tokens(client, _tokens)

      console.log(`Inserted ${_tokens.length} tokens, found ${tokens.length - _tokens.length} without metadata`)

      offset += limit
    }
  } catch (e) {
    console.log('Failed to insert tokens', e)
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
